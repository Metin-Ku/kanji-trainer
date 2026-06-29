import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wordsRouter from "./words";
import srsRouter from "./srs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wordsRouter);
router.use(srsRouter);

export default router;
