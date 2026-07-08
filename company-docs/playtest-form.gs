/**
 * Ascendra — QA-2 Playtest — Google Form generator.
 *
 * Builds the full tester questionnaire (playtest.md) as a Google Form in ONE run,
 * with the correct field types (multiple choice / 1–5 scale / paragraph) so you
 * don't hand-build it. Responses land in a linked Google Sheet you can read as
 * the results table.
 *
 * HOW TO RUN (2 minutes):
 *   1. Go to https://script.google.com  →  New project
 *   2. Delete the placeholder code, paste this whole file, click Save
 *   3. Click Run (▶). Approve the one-time permission prompt (it only creates a
 *      form in your own Drive).
 *   4. Open View → Logs (or Execution log). It prints the LIVE form URL (send to
 *      testers) and the EDIT URL (to tweak).
 *
 * To collect responses in a sheet: open the form's Responses tab → Link to Sheets.
 */
function createAscendraPlaytestForm() {
  const form = FormApp.create('Ascendra — QA-2 Playtest')
    .setDescription(
      'Thanks for playing! Play however you want — there is no right way. Play until you ' +
      'either finish (win or go bankrupt) OR you would naturally stop on your own, then ' +
      'answer these. Heads-up: the very first event after a quiet period can take ~30–60s ' +
      '(the server was asleep) — that is expected, not a bug.',
    )
    .setProgressBar(true)
    .setAllowResponseEdits(false)
    .setLimitOneResponsePerUser(false);

  // Optional identity + the exact run stats (pasted from the in-game "Copy my run" button).
  form.addTextItem()
    .setTitle('Your name or initials (optional)');

  form.addParagraphTextItem()
    .setTitle('Paste your "Copy my run" block here')
    .setHelpText('Before you stopped, you clicked "📋 Copy my run" (bottom of the dashboard, or the end screen). Paste it here — it carries your exact week + stats.')
    .setRequired(false);

  // Q1
  form.addTextItem()
    .setTitle('1. How many in-game weeks did you reach?')
    .setHelpText('Shown as "Week N" in the top bar; the end screen also shows "Weeks played".')
    .setRequired(true);

  // Q2
  form.addMultipleChoiceItem()
    .setTitle('2. Why did you stop?')
    .setChoiceValues([
      'Won — hit $1M (or took an acquisition / went lifestyle)',
      'Lost — went bankrupt',
      'Got bored',
      'Ran out of time',
      'Hit a bug',
    ])
    .showOtherOption(true)
    .setRequired(true);

  // Q3
  form.addScaleItem()
    .setTitle('3. How engaging was the week-to-week loop?')
    .setBounds(1, 5)
    .setLabels('Tedious', 'I wanted to keep going')
    .setRequired(true);

  // Q4  (one of the three sim-can't-validate questions)
  form.addMultipleChoiceItem()
    .setTitle('4. Did the event choices feel like real tradeoffs, or was one obviously the right answer?')
    .setChoiceValues(['Real tradeoffs', 'Usually one was obviously right', 'Mixed'])
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle('4b. (Optional) Explain your answer to #4');

  // Q5  (sim-can't-validate)
  form.addMultipleChoiceItem()
    .setTitle('5. Did the event text feel varied and fresh across your session, or repetitive?')
    .setChoiceValues(['Fresh', 'Repetitive', "Didn't notice"])
    .setRequired(true);

  // Q6  (sim-can't-validate)
  form.addMultipleChoiceItem()
    .setTitle('6. Did the pacing feel right? (a game is meant to run ~15–25 weeks)')
    .setChoiceValues(['Too slow', 'About right', 'Too fast'])
    .setRequired(true);

  // Q7
  form.addParagraphTextItem()
    .setTitle('7. What made you want to keep playing?');

  // Q8
  form.addParagraphTextItem()
    .setTitle('8. What made you want to stop / what was boring or frustrating?');

  // Q9
  form.addParagraphTextItem()
    .setTitle('9. Did you use the Product / Team / Fundraising panels? Were they clear and useful?');

  // Q10
  form.addParagraphTextItem()
    .setTitle('10. Any bugs or moments of confusion?');

  // Q11
  form.addMultipleChoiceItem()
    .setTitle('11. Would you play again?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);

  Logger.log('LIVE form (send to testers):  ' + form.getPublishedUrl());
  Logger.log('EDIT form:                    ' + form.getEditUrl());
}
