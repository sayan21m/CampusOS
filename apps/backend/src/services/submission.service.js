import prisma from "../config/db.js";
import { saveSubmissionFile, deleteSubmissionFile } from "./storage.service.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function createSubmission(assignment_id, student_id, file) {
  if (!file) {
    throw createError("No file provided", 400);
  }

  const assignment = await prisma.assignment.findUnique({
    where: {
      assignment_id: assignment_id,
    },
  });

  if (!assignment) {
    throw createError("Assignment not found", 404);
  }

  const now = new Date();
  const isLate = now > assignment.deadline;

  if (isLate && !assignment.allow_late) {
    throw createError("Submission deadline has passed", 400);
  }

  const existingSubmission = await prisma.submission.findUnique({
    where: {
      assignment_id_student_id: {
        assignment_id: assignment_id,
        student_id: student_id,
      },
    },
  });

  if (!existingSubmission) {
    const storedFile = await saveSubmissionFile({
      file,
      assignment_id,
      student_id,
    });

    try {
      const submission = await prisma.submission.create({
        data: {
          assignment_id: assignment_id,
          student_id: student_id,
          file_url: storedFile.path,
          submitted_at: now,
          is_late: isLate,
        },
      });

      return submission;
    } catch (error) {
      await deleteSubmissionFile(storedFile.path);
      throw error;
    }
  }

  if (isLate) {
    throw createError("Submission replacement is not allowed after the deadline", 400);
  }

  const oldFilePath = existingSubmission.file_url;

  const storedFile = await saveSubmissionFile({
    file,
    assignment_id,
    student_id,
  });

  try {
    const submission = await prisma.submission.update({
      where: {
        submission_id: existingSubmission.submission_id,
      },
      data: {
        file_url: storedFile.path,
        submitted_at: now,
        is_late: false,
        marks: null,
        feedback: null,
        graded_at: null,
      },
    });

    await deleteSubmissionFile(oldFilePath);

    return submission;
  } catch (error) {
    await deleteSubmissionFile(storedFile.path);
    throw error;
  }
}

export async function getAssignmentSubmissions(assignment_id, faculty_id) {
  const facultyAssignment = await prisma.assignment.findUnique({
    where: {
      assignment_id,
    },
    include: {
      subject: true,
    },
  });

  if (!facultyAssignment) {
    throw createError("Assignment not found", 404);
  }

  if (facultyAssignment.faculty_id !== faculty_id) {
    throw createError("Assignment not found", 404);
  }

  const students = await prisma.student.findMany({
    where: {
      dept_id: facultyAssignment.subject.dept_id,
      semester: facultyAssignment.subject.semester,
      section: facultyAssignment.section,
    },
    select: {
      student_id: true,
      roll_number: true,
      full_name: true,
    },
  });

  const submissions = await prisma.submission.findMany({
    where: {
      assignment_id,
    },
  });

  const studentResults = students.map((student) => {
    const submission = submissions.find(
      (submission) => submission.student_id === student.student_id
    );

    let status;

    if (!submission) {
      status = "Pending";
    } else if (submission.marks !== null) {
      status = "Graded";
    } else if (submission.is_late) {
      status = "Late";
    } else {
      status = "Submitted";
    }

    return {
      student_id: student.student_id,
      roll_number: student.roll_number,
      full_name: student.full_name,
      submission: submission
        ? {
            submission_id: submission.submission_id,
            submitted_at: submission.submitted_at,
            is_late: submission.is_late,
            marks: submission.marks,
            feedback: submission.feedback,
            status,
          }
        : null,
      status,
    };
  });

  return {
    assignment: {
      assignment_id,
      title: facultyAssignment.title,
      subject_id: facultyAssignment.subject_id,
      section: facultyAssignment.section,
      deadline: facultyAssignment.deadline,
      max_marks: facultyAssignment.max_marks,
    },
    students: studentResults,
  };
}

export async function gradeSubmission(submission_id, faculty_id, marks, feedback) {
  const submission = await prisma.submission.findUnique({
    where: {
      submission_id,
    },
  });

  if (!submission) {
    throw createError("Submission not found", 404);
  }

  const assignment = await prisma.assignment.findUnique({
    where: {
      assignment_id: submission.assignment_id,
    },
  });

  if (!assignment) {
    throw createError("Assignment not found", 404);
  }

  if (assignment.faculty_id !== faculty_id) {
    throw createError("Assignment not found", 404);
  }

  if (marks < 0 || marks > assignment.max_marks) {
    throw createError("Marks must be between 0 and maximum marks", 400);
  }

  const updatedSubmission = await prisma.submission.update({
    where: {
      submission_id,
    },
    data: {
      marks,
      feedback,
      graded_at: new Date(),
    },
  });

  return updatedSubmission;
}

export async function getMyAssignments(student_id) {
  const student = await prisma.student.findUnique({
    where: {
      student_id,
    },
  });

  if (!student) {
    throw createError("Student profile not found", 404);
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      section: student.section,
      subject: {
        dept_id: student.dept_id,
        semester: student.semester,
      },
    },
  });

  const submissions = await prisma.submission.findMany({
    where: {
      student_id,
    },
    select: {
      submission_id: true,
      assignment_id: true,
      submitted_at: true,
      is_late: true,
      marks: true,
      feedback: true,
    },
  });

  const result = assignments.map((assignment) => {
    const submission = submissions.find(
      (submission) => submission.assignment_id === assignment.assignment_id
    );

    let status;

    if (!submission) {
      status = "Pending";
    } else if (submission.marks !== null) {
      status = "Graded";
    } else if (submission.is_late) {
      status = "Late";
    } else {
      status = "Submitted";
    }

    return {
      assignment_id: assignment.assignment_id,
      title: assignment.title,
      subject_id: assignment.subject_id,
      section: assignment.section,
      deadline: assignment.deadline,
      max_marks: assignment.max_marks,
      submission: submission ?? null,
      status: status,
    };
  });

  return {
    assignments: result,
  };
}
