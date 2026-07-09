import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wordsRouter from "./words";
import srsRouter from "./srs";
import troubleWordsRouter from "./troubleWords";
import themesRouter from "./themes";
import backupRouter from "./backup";
import studyActivityRouter from "./studyActivity";
import categoriesRouter from "./categories";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wordsRouter);
router.use(srsRouter);
router.use(troubleWordsRouter);
router.use(themesRouter);
router.use(backupRouter);
router.use(studyActivityRouter);
router.use(categoriesRouter);

export default router;
