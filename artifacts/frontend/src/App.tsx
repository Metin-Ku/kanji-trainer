import { Router, Route, Switch } from "wouter";
import { HomePage } from "@/pages/HomePage";
import { WordListPage } from "@/pages/WordListPage";
import { PronunciationPage } from "@/pages/PronunciationPage";
import { MeaningPage } from "@/pages/MeaningPage";
import { LearnedHubPage } from "@/pages/LearnedHubPage";
import { LearnedPage } from "@/pages/LearnedPage";
import { LearnedPronPage } from "@/pages/LearnedPronPage";
import { LearnedMeaningPage } from "@/pages/LearnedMeaningPage";
import { StudyPage } from "@/pages/StudyPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SrsHubPage } from "@/pages/SrsHubPage";
import { SrsStudyPage } from "@/pages/SrsStudyPage";
import { TroubleWordsPage } from "@/pages/TroubleWordsPage";
import { ProgressPage } from "@/pages/ProgressPage";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/progress" component={ProgressPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/srs/study" component={SrsStudyPage} />
        <Route path="/srs/trouble" component={TroubleWordsPage} />
        <Route path="/srs" component={SrsHubPage} />
        <Route path="/words" component={WordListPage} />
        <Route path="/pronunciation" component={PronunciationPage} />
        <Route path="/meaning" component={MeaningPage} />
        <Route path="/learned" component={LearnedHubPage} />
        <Route path="/learned/words" component={LearnedPage} />
        <Route path="/learned/pronunciation" component={LearnedPronPage} />
        <Route path="/learned/meaning" component={LearnedMeaningPage} />
        <Route path="/study" component={StudyPage} />
      </Switch>
    </Router>
  );
}

export default App;
