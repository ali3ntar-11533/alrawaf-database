import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contractorsRouter from "./contractors";
import contractsRouter from "./contracts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contractorsRouter);
router.use(contractsRouter);

export default router;
