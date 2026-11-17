import { Router, type IRouter } from "express";
import healthRouter from "./health";
import designSystemsRouter from "./design-systems";
import statsRouter from "./stats";
import projectsRouter from "./projects";
import generationsRouter from "./generations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(designSystemsRouter);
router.use(statsRouter);
router.use(projectsRouter);
router.use(generationsRouter);

export default router;
