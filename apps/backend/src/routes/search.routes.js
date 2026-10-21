import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  listRecentSearchesController,
  searchCampusController,
} from "../controllers/search.controller.js";
import { searchQuerySchema } from "../validators/search.validator.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize("ADMIN", "FACULTY", "STUDENT"),
  validate(searchQuerySchema, "query"),
  searchCampusController
);

router.get(
  "/recent",
  authorize("ADMIN", "FACULTY", "STUDENT"),
  listRecentSearchesController
);

export default router;
