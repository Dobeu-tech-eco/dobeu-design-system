import { Router, type IRouter } from "express";
import { ListDesignSystemsResponse } from "@workspace/api-zod";
import { DESIGN_SYSTEMS } from "../lib/design-systems";

const router: IRouter = Router();

router.get("/design-systems", (_req, res) => {
  res.json(ListDesignSystemsResponse.parse(DESIGN_SYSTEMS));
});

export default router;
