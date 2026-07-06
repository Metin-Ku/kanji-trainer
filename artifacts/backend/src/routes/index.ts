import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wordsRouter from "./words";
import srsRouter from "./srs";
import troubleWordsRouter from "./troubleWords";
import backupRouter from "./backup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wordsRouter);
router.use(srsRouter);
router.use(troubleWordsRouter);
router.use(backupRouter);

export default router;
