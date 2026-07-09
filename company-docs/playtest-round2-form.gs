/**
 * Ascendra — QA-3 (Round 2) Playtest — Google Form generator.
 *
 * Builds the round-2 questionnaire (playtest-round2.md) — focused on whether the
 * added depth helps or overwhelms — as a Google Form in ONE run.
 *
 * HOW TO RUN (2 min):
 *   1. https://script.google.com → New project
 *   2. Delete the placeholder, paste this whole file, Save
 *   3. Run (▶), approve the one-time permission prompt (creates a form in your Drive)
 *   4. View → Logs: prints the LIVE form URL (send to testers) + EDIT URL
 *   5. In the form's Responses tab → Link to Sheets for the results table
 */
function createAscendraRound2Form() {
  const form = FormApp.create('Ascendra — QA-3 Playtest (Round 2)')
    .setDescription(
      'Thanks for playing! This is a startup-sim game — run a company week by week. ' +
      'Play however you want and explore whatever you want; there is no tutorial on ' +
      'purpose. Play until you finish or would naturally stop, then answer these. ' +
      'Heads-up: the first AI event/advisor reply after a quiet period can take ~30–60s ' +
      '(the server was asleep) — that is expected.',
    )
    .setProgressBar(true);

  form.addTextItem().setTitle('Your name or initials (optional)');

  form.addParagraphTextItem()
    .setTitle('Paste your "Copy my run" block here')
    .setHelpText('Before you stopped, click "📋 Copy my run" at the bottom of the dashboard and paste it here.');

  // Q1
  form.addTextItem().setTitle('1. How many in-game weeks did you reach?').setRequired(true);

  // Q2
  form.addMultipleChoiceItem()
    .setTitle('2. How did your run end?')
    .setChoiceValues([
      'Won — IPO', 'Won — Acquisition', 'Won — Lifestyle business', 'Won — Unicorn ($1B)',
      'Lost — bankrupt', 'Got bored', 'Ran out of time', 'Hit a bug',
    ])
    .showOtherOption(true).setRequired(true);

  // Q3
  form.addScaleItem().setTitle('3. How engaging was the week-to-week loop?')
    .setBounds(1, 5).setLabels('Tedious', 'Kept me going').setRequired(true);

  // Q4 — the key depth question
  form.addMultipleChoiceItem()
    .setTitle('4. Did the game feel rich and clear, or overwhelming?')
    .setChoiceValues(['Rich and clear', 'A lot, but manageable', 'Overwhelming / confusing'])
    .setRequired(true);
  form.addParagraphTextItem().setTitle('4b. (Optional) Explain your answer to #4');

  // Q5 — systems used
  form.addCheckboxItem()
    .setTitle('5. Which systems did you actually use? (check all)')
    .setChoiceValues(['Product', 'Team', 'Marketing', 'Customer segments', 'Fundraising', 'None of these'])
    .setRequired(true);

  // Q6 — tools opened
  form.addCheckboxItem()
    .setTitle('6. Which "command center" tools did you open? (check all)')
    .setChoiceValues(['Advisor', 'Board meeting', 'Competitors', 'News', 'Sales pipeline', 'Financials', 'None'])
    .setRequired(true);

  // Q7 — advisor value
  form.addMultipleChoiceItem()
    .setTitle('7. The AI Advisor (💬) — did you use it, and was it useful?')
    .setChoiceValues(["Didn't notice it", 'Used it — helpful', 'Used it — not helpful'])
    .setRequired(true);
  form.addParagraphTextItem().setTitle('7b. (Optional) Anything about the AI features (advisor / board / news / events)?');

  // Q8
  form.addMultipleChoiceItem()
    .setTitle('8. Did the event choices feel like real tradeoffs, or was one obviously best?')
    .setChoiceValues(['Real tradeoffs', 'Usually one was obviously right', 'Mixed'])
    .setRequired(true);

  // Q9
  form.addMultipleChoiceItem()
    .setTitle('9. Did the event / AI text feel fresh and varied, or repetitive?')
    .setChoiceValues(['Fresh', 'Repetitive', "Didn't notice"])
    .setRequired(true);

  // Q10
  form.addMultipleChoiceItem()
    .setTitle('10. Did the pacing feel right? (a game runs ~15–25 weeks)')
    .setChoiceValues(['Too slow', 'About right', 'Too fast'])
    .setRequired(true);

  // Q11
  form.addMultipleChoiceItem()
    .setTitle('11. Did having multiple ways to win (IPO / acquisition / lifestyle / unicorn) make the ending feel meaningful?')
    .setChoiceValues(['Yes', "Didn't notice the options", 'No'])
    .setRequired(true);

  // Q12 — UI
  form.addMultipleChoiceItem()
    .setTitle('12. Was the interface clear and easy to navigate?')
    .setChoiceValues(['Yes', 'Mostly', 'Confusing'])
    .setRequired(true);
  form.addParagraphTextItem().setTitle('12b. (Optional) If confusing, where?');

  // Q13-15 free text
  form.addParagraphTextItem().setTitle('13. What made you want to keep playing?');
  form.addParagraphTextItem().setTitle('14. What was confusing, boring, or frustrating?');
  form.addParagraphTextItem().setTitle('15. Any bugs?');

  // Q16
  form.addMultipleChoiceItem().setTitle('16. Would you play again?')
    .setChoiceValues(['Yes', 'No']).setRequired(true);

  Logger.log('LIVE form (send to testers):  ' + form.getPublishedUrl());
  Logger.log('EDIT form:                    ' + form.getEditUrl());
}
