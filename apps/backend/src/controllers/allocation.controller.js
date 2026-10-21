import {
  createAllocation,
  deleteAllocation,
  listAllocations,
} from "../services/allocation.service.js";

export async function listAllocationsController(req, res) {
  try {
    const allocations = await listAllocations(req.validatedQuery || req.query);
    return res.status(200).json({
      message: "Allocations retrieved successfully",
      count: allocations.length,
      allocations,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function createAllocationController(req, res) {
  try {
    const allocation = await createAllocation(req.body);
    return res.status(201).json({
      message: "Faculty allocated to subject successfully",
      allocation,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function deleteAllocationController(req, res) {
  try {
    const result = await deleteAllocation(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
