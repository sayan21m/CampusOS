import prisma from "../config/db.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function createAssignment(assignment_data, faculty_id) {
  const {
    subject_id,
    title,
    description,
    section,
    deadline,
    max_marks,
    allow_late,
    attachment_url,
  } = assignment_data;

  const subject = await prisma.subject.findUnique({
    where: {
      subject_id: subject_id,
    },
  });

  if (!subject) {
    throw createError("Subject not found", 404);
  }

  const faculty = await prisma.faculty.findUnique({
    where: {
      faculty_id: faculty_id,
    },
  });

  if (!faculty) {
    throw createError("Faculty profile not found", 404);
  }

  const existingAssignment = await prisma.assignment.findFirst({
    where: {
      subject_id,
      faculty_id,
      title,
      section,
      deadline,
    },
  });

  if (existingAssignment) {
    throw createError("Assignment already exists", 409);
  }

  const assignment = await prisma.assignment.create({
    data: {
      subject_id,
      faculty_id,
      title,
      description,
      section,
      deadline,
      max_marks,
      allow_late,
      attachment_url,
    },
  });

  return {
    assignment_id: assignment.assignment_id,
    subject_id: assignment.subject_id,
    faculty_id: assignment.faculty_id,
    title: assignment.title,
    description: assignment.description,
    section: assignment.section,
    deadline: assignment.deadline,
    max_marks: assignment.max_marks,
    allow_late: assignment.allow_late,
    attachment_url: assignment.attachment_url,
    created_at: assignment.created_at,
  };
}

export async function getAssignmentById(assignment_id) {
  const assignment = await prisma.assignment.findUnique({
    where: {
      assignment_id,
    },
  });

  if (!assignment) {
    throw createError("Assignment not found", 404);
  }

  return {
    assignment_id: assignment.assignment_id,
    subject_id: assignment.subject_id,
    faculty_id: assignment.faculty_id,
    title: assignment.title,
    description: assignment.description,
    section: assignment.section,
    deadline: assignment.deadline,
    max_marks: assignment.max_marks,
    allow_late: assignment.allow_late,
    attachment_url: assignment.attachment_url,
    created_at: assignment.created_at,
  };
}

export async function updateAssignmentById(assignment_id, assignment_data, faculty_id) {
  const existingAssignment = await prisma.assignment.findFirst({
    where: {
      assignment_id: assignment_id,
      faculty_id: faculty_id,
    },
  });

  if (!existingAssignment) {
    throw createError("Assignment not found", 404);
  }

  const updateData = {};

  if (assignment_data.title !== undefined) {
    updateData.title = assignment_data.title;
  }

  if (assignment_data.description !== undefined) {
    updateData.description = assignment_data.description;
  }

  if (assignment_data.deadline !== undefined) {
    updateData.deadline = assignment_data.deadline;
  }

  if (assignment_data.max_marks !== undefined) {
    updateData.max_marks = assignment_data.max_marks;
  }

  if (assignment_data.allow_late !== undefined) {
    updateData.allow_late = assignment_data.allow_late;
  }

  if (assignment_data.attachment_url !== undefined) {
    updateData.attachment_url = assignment_data.attachment_url;
  }

  if (Object.keys(updateData).length === 0) {
    throw createError("No fields provided for update", 400);
  }

  const updatedAssignment = await prisma.assignment.update({
    where: {
      assignment_id,
    },
    data: updateData,
  });

  return {
    assignment_id: updatedAssignment.assignment_id,
    subject_id: updatedAssignment.subject_id,
    faculty_id: updatedAssignment.faculty_id,
    title: updatedAssignment.title,
    description: updatedAssignment.description,
    section: updatedAssignment.section,
    deadline: updatedAssignment.deadline,
    max_marks: updatedAssignment.max_marks,
    allow_late: updatedAssignment.allow_late,
    attachment_url: updatedAssignment.attachment_url,
    created_at: updatedAssignment.created_at,
  };
}
