import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contractorsRouter from "./contractors";
import contractsMgmtRouter from "./contracts_mgmt";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contractorsRouter);
router.use(contractsMgmtRouter);

export default router;
