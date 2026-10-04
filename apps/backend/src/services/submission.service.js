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
