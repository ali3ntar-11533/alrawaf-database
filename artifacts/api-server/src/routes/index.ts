import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contractorsRouter from "./contractors";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contractorsRouter);

export default router;
