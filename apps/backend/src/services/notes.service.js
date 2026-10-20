import prisma from "../config/db.js";
import fs from "node:fs/promises";
import path from "node:path";
import { validateNotesFile } from "../validators/notes.validator.js";
import { saveNotesFile, deleteNotesFile } from "./notes-storage.service.js";

const STORAGE_ROOT = path.resolve("apps/backend/storage");

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function createNotes(userId, notesData, file) {
  const faculty = await prisma.faculty.findUnique({
    where: { user_id: userId },
  });

  if (!faculty) {
    throw createError("Faculty profile not found", 404);
  }

  const {
    subject_id,
    title,
    description,
    unit_number,
    material_type,
    academic_year,
  } = notesData;

  const subject = await prisma.subject.findUnique({
    where: { subject_id },
  });

  if (!subject) {
    throw createError("Subject not found", 404);
  }

  if (subject.dept_id !== faculty.dept_id) {
    throw createError("You cannot upload materials for this subject", 403);
  }

  const allotment = await prisma.timetableSlot.findFirst({
    where: {
      subject_id,
      faculty_id: faculty.faculty_id,
    },
    select: { timetable_id: true },
  });

  if (!allotment) {
    throw createError(
      "You are not allotted to teach this subject",
      403
    );
  }

  const savedFile = await saveNotesFile({
    file,
    subject_id,
    academic_year,
    unit_number,
    faculty_id: faculty.faculty_id,
  });

  try {
    const notes = await prisma.notes.create({
      data: {
        subject_id,
        uploaded_by: faculty.faculty_id,
        title,
        description,
        unit_number,
        material_type,
        academic_year,
        storage_key: savedFile.path,
        file_size_bytes: BigInt(savedFile.size),
      },
      select: {
        notes_id: true,
        subject_id: true,
        uploaded_by: true,
        title: true,
        description: true,
        unit_number: true,
        material_type: true,
        academic_year: true,
        file_size_bytes: true,
        created_at: true,
        updated_at: true,
      },
    });

    return {
      ...notes,
      file_size_bytes: notes.file_size_bytes.toString(),
    };
  } catch (error) {
    try {
      await deleteNotesFile(savedFile.path);
    } catch (cleanupError) {
      console.error("Failed to clean up uploaded notes file", cleanupError);
    }

    throw error;
  }
}


export async function getNotes(user_id, subject_id, unit_number) {
  const user = await prisma.user.findUnique({
    where: { user_id },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  const filters = {};

  if (subject_id !== undefined) {
    const parsedSubjectId = Number(subject_id);

    if (!Number.isInteger(parsedSubjectId) || parsedSubjectId <= 0) {
      throw createError("Invalid subject ID", 400);
    }

    filters.subject_id = parsedSubjectId;
  }

  if (unit_number !== undefined) {
    const parsedUnitNumber = Number(unit_number);

    if (!Number.isInteger(parsedUnitNumber) || parsedUnitNumber <= 0) {
      throw createError("Invalid unit number", 400);
    }

    filters.unit_number = parsedUnitNumber;
  }

  if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { user_id },
    });

    if (!student) {
      throw createError("Student profile not found", 404);
    }

    filters.subject = {
      dept_id: student.dept_id,
      semester: student.semester,
      is_active: true,
    };
  } else if (user.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({
      where: { user_id },
    });

    if (!faculty) {
      throw createError("Faculty profile not found", 404);
    }

    filters.uploaded_by = faculty.faculty_id;
  } else {
    throw createError("Permission denied", 403);
  }

  return prisma.notes.findMany({
    where: filters,
    orderBy: [
      { subject_id: "asc" },
      { unit_number: "asc" },
      { created_at: "desc" },
    ],
    select: {
      notes_id: true,
      subject_id: true,
      uploaded_by: true,
      title: true,
      description: true,
      unit_number: true,
      material_type: true,
      academic_year: true,
      file_size_bytes: true,
      created_at: true,
      updated_at: true,
      subject: {
        select: {
          subject_id: true,
          subject_code: true,
          subject_name: true,
        },
      },
    },
  }).then((notes) =>
    notes.map((note) => ({
      ...note,
      file_size_bytes: note.file_size_bytes.toString(),
    }))
  );
}

export async function getAccessibleNote(userId, notesId) {
  const parsedId = Number(notesId);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createError("Invalid notes ID", 400);
  }

  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw createError("User not found or inactive", 403);
  }

  const note = await prisma.notes.findUnique({
    where: { notes_id: parsedId },
    include: {
      subject: {
        select: {
          dept_id: true,
          semester: true,
          is_active: true,
        },
      },
    },
  });

  if (!note) {
    throw createError("Material not found", 404);
  }

  if (user.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({
      where: { user_id: userId },
      select: { faculty_id: true, dept_id: true },
    });

    if (!faculty) {
      throw createError("Faculty profile not found", 404);
    }

    const allotted = await prisma.timetableSlot.findFirst({
      where: {
        subject_id: note.subject_id,
        faculty_id: faculty.faculty_id,
      },
      select: { timetable_id: true },
    });

    if (
      note.subject.dept_id !== faculty.dept_id ||
      !allotted
    ) {
      throw createError("You cannot access this material", 403);
    }
  } else if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { user_id: userId },
      select: { dept_id: true, semester: true },
    });

    if (!student) {
      throw createError("Student profile not found", 404);
    }

    if (
      !note.subject.is_active ||
      note.subject.dept_id !== student.dept_id ||
      note.subject.semester !== student.semester
    ) {
      throw createError("You cannot access this material", 403);
    }
  } else {
    throw createError("Permission denied", 403);
  }

  const absolutePath = path.resolve(STORAGE_ROOT, note.storage_key);
  const relativePath = path.relative(STORAGE_ROOT, absolutePath);

  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw createError("Invalid stored file path", 500);
  }

  try {
    const stat = await fs.stat(absolutePath);

    if (!stat.isFile()) {
      throw createError("Stored file not found", 404);
    }
  } catch (error) {
    if (error.statusCode) throw error;

    if (error.code === "ENOENT") {
      throw createError("Stored file not found", 404);
    }

    throw error;
  }

  return { note, absolutePath };
}

export async function replaceNotes(userId, notesId, notesData, file) {
    const parsedId = Number(notesId);
  
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw createError("Invalid material ID", 400);
    }
  
    const fileValidation = validateNotesFile(file);
    if (!fileValidation.success) {
      throw createError(fileValidation.message, 400);
    }
  
    const faculty = await prisma.faculty.findUnique({
      where: { user_id: userId },
    });
  
    if (!faculty) {
      throw createError("Faculty profile not found", 404);
    }
  
    const existing = await prisma.notes.findUnique({
      where: { notes_id: parsedId },
      include: {
        subject: {
          select: { dept_id: true },
        },
      },
    });
  
    if (!existing) {
      throw createError("Material not found", 404);
    }
  
    if (existing.uploaded_by !== faculty.faculty_id) {
      throw createError(
        "You can only replace materials uploaded by you",
        403
      );
    }
  
    const allotted = await prisma.timetableSlot.findFirst({
      where: {
        subject_id: existing.subject_id,
        faculty_id: faculty.faculty_id,
      },
      select: { timetable_id: true },
    });
  
    if (
      existing.subject.dept_id !== faculty.dept_id ||
      !allotted
    ) {
      throw createError(
        "You are not authorized to replace this material",
        403
      );
    }
  
    const updatedMetadata = {
      title: notesData.title ?? existing.title,
      description: notesData.description ?? existing.description,
      unit_number: notesData.unit_number ?? existing.unit_number,
      material_type:
        notesData.material_type ?? existing.material_type,
      academic_year:
        notesData.academic_year ?? existing.academic_year,
    };
  
    const savedFile = await saveNotesFile({
      file,
      subject_id: existing.subject_id,
      academic_year: updatedMetadata.academic_year,
      unit_number: updatedMetadata.unit_number,
      faculty_id: faculty.faculty_id,
    });
  
    let updated;
  
    try {
      updated = await prisma.notes.update({
        where: { notes_id: parsedId },
        data: {
          ...updatedMetadata,
          storage_key: savedFile.path,
          file_size_bytes: BigInt(savedFile.size),
        },
        select: {
          notes_id: true,
          subject_id: true,
          uploaded_by: true,
          title: true,
          description: true,
          unit_number: true,
          material_type: true,
          academic_year: true,
          file_size_bytes: true,
          created_at: true,
          updated_at: true,
        },
      });
    } catch (error) {
      try {
        await deleteNotesFile(savedFile.path);
      } catch (cleanupError) {
        console.error(
          "Failed to clean up replacement file:",
          cleanupError
        );
      }
  
      throw error;
    }

    if (existing.storage_key !== savedFile.path) {
      try {
        await deleteNotesFile(existing.storage_key);
      } catch (cleanupError) {
        console.error(
          "Replacement succeeded, but old file cleanup failed:",
          cleanupError
        );
      }
    }
  
    return {
      ...updated,
      file_size_bytes: updated.file_size_bytes.toString(),
    };
}

export async function deleteNotes(user_id, notes_id) {
    const parsedId = Number(notes_id);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
        throw createError("Invalid material ID", 400);
    }

    const user = await prisma.user.findUnique({
        where: {
            user_id,
        },
    });

    if (!user) {
        throw createError("User not found", 404);
    }

    const faculty = await prisma.faculty.findUnique({
        where: {
            user_id,
        },
    });

    if (!faculty) {
        throw createError("Faculty profile not found", 404);
    }

    const existing = await prisma.notes.findUnique({
        where: { notes_id: parsedId },
        include: {
          subject: {
            select: { dept_id: true },
          },
        },
    });
    
    if (!existing) {
        throw createError("Material not found", 404);
    }

    if (existing.uploaded_by !== faculty.faculty_id) {
        throw createError("You can only delete materials uploaded by you", 403);
    }

    const allotted = await prisma.timetableSlot.findFirst({
        where: {
            subject_id: existing.subject_id,
            faculty_id: faculty.faculty_id,
        },
        select: { timetable_id: true },
    });

    if (
        existing.subject.dept_id !== faculty.dept_id ||
        !allotted
        ) {
        throw createError(
            "You are not authorized to delete this material",
            403
        );
    }

    await prisma.notes.delete({
        where: { notes_id: parsedId },
    });

    try {
        await deleteNotesFile(existing.storage_key);
    } catch (cleanupError) {
        console.error(
            `Material ${parsedId} was deleted from the database, but its file cleanup failed:`,
            cleanupError
        );
    }

    return {
        notes_id: parsedId,
        message: "Material deleted successfully",
    };
}