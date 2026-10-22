// Home exercise library — no equipment beyond a chair, a wall, a towel and a backpack.
// Low-impact by design (no jumping): spine-friendly, joint-kind, built around posture and mobility.
// MET values follow the Compendium of Physical Activities.

export type ExKind = 'breath' | 'mobility' | 'stretch' | 'strength' | 'core' | 'cardio'
export type Exercise = {
  id: string
  name: string
  kind: ExKind
  unit: 'reps' | 'sec'
  perSide?: boolean
  met: number
  how: string[]
  cue?: string
  spine?: string
  easier?: string
  harder?: string
}

export const EXERCISES: Exercise[] = [
  // ── Breathing & mobility ──
  {
    id: 'breath', name: 'Rib-cage breathing', kind: 'breath', unit: 'reps', met: 1.5,
    how: ['Sit tall or lie on your back, one hand on your belly, one on your ribs.', 'Breathe in through the nose for 4 seconds — belly first, then ribs widening sideways.', 'Breathe out slowly for 6 seconds through pursed lips.'],
    cue: 'Feel the ribs open like an umbrella.',
    spine: 'Keeps chest expansion — spinal stiffness can lock up the rib joints, and this is the daily antidote.',
  },
  {
    id: 'chin-tuck', name: 'Chin tucks', kind: 'mobility', unit: 'reps', met: 1.5,
    how: ['Stand or sit tall with eyes level.', 'Glide your chin straight back (make a double chin) without tilting your head.', 'Hold 3 seconds, release.'],
    cue: 'Grow tall through the crown of your head.',
    spine: 'Counters forward-head posture, which tends to creep in as the upper back stiffens.',
  },
  {
    id: 'neck-rot', name: 'Neck rotations', kind: 'mobility', unit: 'reps', perSide: true, met: 1.5,
    how: ['Sit tall. Slowly turn your head to look over one shoulder.', 'Hold 2 seconds, return to centre, then the other side.'],
    spine: 'Stay in a pain-free range. Rotation is often the first movement to stiffen.',
  },
  {
    id: 'shoulder-roll', name: 'Shoulder rolls', kind: 'mobility', unit: 'reps', met: 1.8,
    how: ['Stand tall with arms relaxed.', 'Roll your shoulders up, back and down in big slow circles.'],
    cue: 'Finish each circle with the shoulder blades drawn gently down.',
  },
  {
    id: 'cat-cow', name: 'Cat–cow', kind: 'mobility', unit: 'reps', met: 2.3,
    how: ['On hands and knees: hands under shoulders, knees under hips.', 'Breathe in: let the belly drop, lift chest and gaze (cow).', 'Breathe out: round the back, tuck chin and tailbone (cat).'],
    cue: 'Move one vertebra at a time, slowly.',
    spine: 'Mobilises the whole spine through flexion and extension — ideal first thing in the morning.',
    easier: 'Do it seated on a chair with hands on knees.',
  },
  {
    id: 'thread-needle', name: 'Thread the needle', kind: 'mobility', unit: 'reps', perSide: true, met: 2.3,
    how: ['Start on hands and knees.', 'Slide one arm under the other, lowering that shoulder towards the floor.', 'Come back and open the same arm up to the ceiling, eyes following your hand.'],
    spine: 'Upper-back rotation — the movement stiff spines lose first. Go slow, never force it.',
  },
  {
    id: 'prone-pressup', name: 'Prone press-up', kind: 'mobility', unit: 'reps', met: 2.3,
    how: ['Lie face down with hands under your shoulders.', 'Press your chest up, keeping hips on the floor and lower back relaxed.', 'Hold 2 seconds at the top, lower slowly.'],
    spine: 'Spinal extension — the direction a stooping posture loses. Only as high as is comfortable.',
    easier: 'Stay on your forearms (sphinx position) and breathe.',
  },
  {
    id: 'standing-ext', name: 'Standing back extension', kind: 'mobility', unit: 'reps', met: 2,
    how: ['Stand tall, hands on your lower back or hips.', 'Gently lean back, lifting your chest towards the ceiling.', 'Hold 2 seconds and return.'],
    spine: 'A quick posture reset you can do anywhere — great after long sitting.',
  },
  {
    id: 'wall-angel', name: 'Wall angels', kind: 'mobility', unit: 'reps', met: 2.3,
    how: ['Stand with back, hips and head against a wall, feet a little forward.', "Arms in a 'W' against the wall; slide them up into a 'Y' and back down.", 'Keep ribs down and the back of your head touching the wall.'],
    spine: "Trains upright posture and opens the chest. If your head can't reach the wall, put a folded towel behind it.",
  },
  {
    id: 'open-book', name: 'Side-lying open book', kind: 'mobility', unit: 'reps', perSide: true, met: 2,
    how: ['Lie on your side, knees bent to 90°, arms straight out in front together.', 'Open the top arm like a book, rotating your upper back towards the floor behind you.', 'Follow the hand with your eyes, then return slowly.'],
    spine: 'Rotation with the lower back supported — safe and very effective.',
  },
  {
    id: 'towel-ext', name: 'Thoracic extension on a towel', kind: 'mobility', unit: 'sec', met: 1.8,
    how: ['Roll a towel tightly. Lie on your back with it across your upper back (shoulder-blade level).', 'Support your head with your hands and let your chest open over the towel.', 'Breathe slowly. Shift the towel a little lower and repeat.'],
    spine: 'Gently reverses the forward curve of the upper back.',
  },
  {
    id: 'supine-twist', name: 'Supine knee rocks', kind: 'mobility', unit: 'reps', met: 1.8,
    how: ['Lie on your back, knees bent, feet flat.', 'Let both knees drop slowly to one side, then to the other.'],
    spine: 'Gentle lower-back rotation — perfect for flare days.',
  },
  {
    id: 'heel-slide', name: 'Heel slides', kind: 'mobility', unit: 'reps', perSide: true, met: 1.5,
    how: ['Lie on your back with knees bent.', 'Slowly slide one heel away until the leg is straight, then pull it back.'],
    spine: 'Keeps hips moving without load when everything feels stiff.',
  },
  {
    id: 'seated-twist', name: 'Seated spinal twist', kind: 'mobility', unit: 'reps', perSide: true, met: 1.8,
    how: ['Sit tall on a chair, feet flat.', 'Turn your upper body to one side, holding the chair back for a gentle assist.', 'Breathe out to turn a little further, then switch.'],
  },

  // ── Stretches ──
  {
    id: 'hip-flexor', name: 'Half-kneeling hip flexor stretch', kind: 'stretch', unit: 'sec', perSide: true, met: 2,
    how: ['Kneel on one knee (cushion underneath), other foot forward.', 'Tuck your pelvis under and shift forward until you feel the front of the hip stretch.', 'Reach the arm on the kneeling side up overhead.'],
    spine: 'Tight hip flexors pull you into a stoop — keep them long.',
  },
  {
    id: 'hamstring', name: 'Hamstring stretch (towel)', kind: 'stretch', unit: 'sec', perSide: true, met: 2,
    how: ['Lie on your back and loop a towel around one foot.', 'Straighten that leg up towards the ceiling until the back of the thigh stretches.', 'Keep the other leg bent or flat.'],
  },
  {
    id: 'doorway-pec', name: 'Doorway chest stretch', kind: 'stretch', unit: 'sec', met: 2,
    how: ['Stand in a doorway, forearms on the frame at shoulder height.', 'Step one foot through and lean gently until the chest opens.'],
    spine: 'Opens the front of the chest so the shoulders can sit back.',
  },
  {
    id: 'child-pose', name: "Child's pose with side reach", kind: 'stretch', unit: 'sec', met: 2,
    how: ['Kneel and sit back towards your heels, arms long in front.', 'Walk both hands to one side to stretch the opposite side of your back, then switch.'],
    spine: 'A gentle release — never force the hips down.',
  },
  {
    id: 'figure-4', name: 'Figure-4 glute stretch', kind: 'stretch', unit: 'sec', perSide: true, met: 2,
    how: ['Lie on your back, cross one ankle over the opposite knee.', 'Pull the bottom thigh gently towards your chest.'],
  },

  // ── Strength ──
  {
    id: 'wall-pushup', name: 'Wall push-up', kind: 'strength', unit: 'reps', met: 3.8,
    how: ['Hands on a wall at shoulder height, feet a step back.', 'Lower your chest towards the wall with a straight body.', 'Push back to the start.'],
    cue: 'Body moves as one plank.',
    harder: 'Incline push-up on a table or bed.',
  },
  {
    id: 'incline-pushup', name: 'Incline push-up', kind: 'strength', unit: 'reps', met: 3.8,
    how: ['Hands on a sturdy table, bed edge or kitchen counter.', 'Lower your chest to the edge with a straight body.', 'Press back up.'],
    easier: 'Wall push-up.', harder: 'Knee push-up on the floor.',
  },
  {
    id: 'knee-pushup', name: 'Knee push-up', kind: 'strength', unit: 'reps', met: 4,
    how: ['Hands under shoulders, knees on the floor, body straight from knees to head.', 'Lower your chest towards the floor.', 'Press back up.'],
    easier: 'Incline push-up.', harder: 'Full push-up.',
  },
  {
    id: 'pushup', name: 'Push-up', kind: 'strength', unit: 'reps', met: 4.5,
    how: ['Hands slightly wider than shoulders, body in one straight line.', 'Lower until your chest is close to the floor.', 'Press up without letting the hips sag.'],
    easier: 'Knee push-up.',
  },
  {
    id: 'chair-squat', name: 'Chair squat (sit-to-stand)', kind: 'strength', unit: 'reps', met: 3.8,
    how: ['Stand in front of a sturdy chair, feet hip-width.', 'Sit back slowly until you lightly touch the seat.', 'Drive through your heels to stand tall.'],
    spine: 'Keep the chest proud and the spine neutral.',
    harder: 'Bodyweight squat without the chair.',
  },
  {
    id: 'squat', name: 'Bodyweight squat', kind: 'strength', unit: 'reps', met: 4,
    how: ['Feet shoulder-width, toes slightly out.', 'Sit hips back and down as deep as comfortable.', 'Stand up by pushing the floor away.'],
    easier: 'Chair squat.', harder: 'Tempo squat (3 seconds down).',
  },
  {
    id: 'tempo-squat', name: 'Tempo squat (3-1-1)', kind: 'strength', unit: 'reps', met: 4.5,
    how: ['Squat down over 3 seconds.', 'Pause 1 second at the bottom.', 'Stand up in 1 second.'],
    cue: 'Slow down to make bodyweight heavy.',
  },
  {
    id: 'split-squat', name: 'Split squat', kind: 'strength', unit: 'reps', perSide: true, met: 4.5,
    how: ['Stand in a long stride, back heel lifted. Hold a wall or chair for balance.', 'Lower the back knee towards the floor.', 'Push up through the front foot.'],
    spine: 'Shorten the range if knees or hips complain — pain-free beats deep.',
  },
  {
    id: 'reverse-lunge', name: 'Reverse lunge', kind: 'strength', unit: 'reps', perSide: true, met: 4.5,
    how: ['Stand tall, holding a chair if needed.', 'Step one foot back and lower both knees to about 90°.', 'Drive through the front heel to return.'],
    easier: 'Split squat holding a wall.',
  },
  {
    id: 'wall-sit', name: 'Wall sit', kind: 'strength', unit: 'sec', met: 3.5,
    how: ['Back flat against a wall, slide down until knees are bent (no lower than 90°).', 'Hold, breathing steadily.'],
    easier: 'Stay higher up the wall.',
  },
  {
    id: 'glute-bridge', name: 'Glute bridge', kind: 'strength', unit: 'reps', met: 3.5,
    how: ['Lie on your back, knees bent, feet flat.', 'Squeeze your glutes and lift your hips into a straight line.', 'Pause, lower slowly.'],
    spine: 'Strong glutes take load off the lower back.',
    harder: 'Single-leg bridge.',
  },
  {
    id: 'sl-bridge', name: 'Single-leg glute bridge', kind: 'strength', unit: 'reps', perSide: true, met: 4,
    how: ['Bridge position, one foot lifted off the floor.', 'Lift the hips evenly using the planted leg.', 'Lower slowly.'],
  },
  {
    id: 'hip-thrust', name: 'Hip thrust (on sofa)', kind: 'strength', unit: 'reps', met: 4.5,
    how: ['Upper back against the edge of a sofa or bed, feet flat.', 'Drive hips up until your body is flat like a table.', 'Squeeze, then lower.'],
    cue: 'Chin tucked, ribs down.',
  },
  {
    id: 'hinge', name: 'Hip hinge drill', kind: 'strength', unit: 'reps', met: 3.5,
    how: ['Hold a broomstick along your spine (head, upper back and tailbone touching it).', 'Push your hips back with soft knees until you feel the hamstrings.', 'Stand up by squeezing the glutes — the stick never leaves those three points.'],
    spine: 'Teaches bending at the hips instead of the back — protects your spine for life.',
  },
  {
    id: 'backpack-rdl', name: 'Backpack Romanian deadlift', kind: 'strength', unit: 'reps', met: 4.5,
    how: ['Hold a backpack (books inside) in front of your thighs.', 'Hinge at the hips, sliding it down your legs with a flat back.', 'Stand tall by driving the hips forward.'],
    spine: 'Neutral spine always — if your back starts to round, the range ends there.',
  },
  {
    id: 'backpack-row', name: 'Backpack bent-over row', kind: 'strength', unit: 'reps', met: 4,
    how: ['Hinge forward with a flat back, backpack hanging from your hands.', 'Pull it to your lower ribs, squeezing your shoulder blades together.', 'Lower with control.'],
    spine: 'Builds the upper-back muscles that hold you upright.',
  },
  {
    id: 'door-row', name: 'Doorframe row', kind: 'strength', unit: 'reps', met: 3.8,
    how: ['Stand in a doorway and hold both sides of the frame at chest height.', 'Lean back with straight arms, feet close to the door.', 'Pull your chest to the frame, squeezing the shoulder blades.'],
    easier: 'Stand more upright.',
  },
  {
    id: 'prone-yt', name: 'Prone Y–T raises', kind: 'strength', unit: 'reps', met: 3,
    how: ["Lie face down, forehead on a towel, arms overhead in a 'Y'.", 'Lift your arms a few centimetres, thumbs up, and lower. Then repeat with arms out in a "T".'],
    spine: 'Strengthens the upper-back extensors that hold you upright — a key posture exercise.',
  },
  {
    id: 'superman', name: 'Superman hold', kind: 'strength', unit: 'sec', met: 3,
    how: ['Lie face down, arms forward.', 'Lift arms, chest and legs slightly off the floor, gaze down.', 'Hold, breathing steadily.'],
    spine: 'Back-extensor endurance. Keep it small — a few centimetres is enough.',
    easier: 'Lift only the arms and chest.',
  },
  {
    id: 'calf-raise', name: 'Calf raises', kind: 'strength', unit: 'reps', met: 3,
    how: ['Stand tall near a wall for balance.', 'Rise onto your toes, pause, lower slowly.'],
    harder: 'Single-leg calf raises.',
  },
  {
    id: 'pike-pushup', name: 'Pike push-up', kind: 'strength', unit: 'reps', met: 4.5,
    how: ['Start in a downward-dog shape, hips high.', 'Bend your elbows to lower the head towards the floor between your hands.', 'Press back up.'],
    spine: 'Skip it if your neck or shoulders feel stiff that day.',
  },

  // ── Core ──
  {
    id: 'bird-dog', name: 'Bird dog', kind: 'core', unit: 'reps', perSide: true, met: 3,
    how: ['On hands and knees, back flat.', 'Reach one arm forward and the opposite leg back until both are level with your body.', 'Pause 2 seconds, return, switch sides.'],
    spine: 'Trains the spine to stay still while limbs move — the best core exercise for a sensitive back.',
  },
  {
    id: 'dead-bug', name: 'Dead bug', kind: 'core', unit: 'reps', perSide: true, met: 3,
    how: ['Lie on your back, arms up, knees bent at 90° above your hips.', 'Press your lower back into the floor.', 'Lower one arm and the opposite leg towards the floor, return, switch.'],
    spine: 'If your back arches off the floor, shorten the reach.',
  },
  {
    id: 'plank-knee', name: 'Knee plank', kind: 'core', unit: 'sec', met: 3,
    how: ['Forearms under shoulders, knees on the floor.', 'Make a straight line from knees to head and hold.'],
    harder: 'Full forearm plank.',
  },
  {
    id: 'plank', name: 'Forearm plank', kind: 'core', unit: 'sec', met: 3.8,
    how: ['Forearms under shoulders, legs straight, body in one line.', 'Brace like someone is about to poke your stomach. Hold.'],
    easier: 'Knee plank.',
  },
  {
    id: 'side-plank-knee', name: 'Side plank (knees)', kind: 'core', unit: 'sec', perSide: true, met: 3,
    how: ['Lie on your side, elbow under shoulder, knees bent.', 'Lift your hips so your body is straight from knees to head.'],
    harder: 'Full side plank.',
  },
  {
    id: 'side-plank', name: 'Side plank', kind: 'core', unit: 'sec', perSide: true, met: 3.8,
    how: ['Elbow under shoulder, legs straight and stacked.', 'Lift the hips into a straight line and hold.'],
  },
  {
    id: 'standing-crunch', name: 'Standing cross-body crunch', kind: 'core', unit: 'reps', met: 4,
    how: ['Stand tall, hands lightly behind your head.', 'Bring one knee up and the opposite elbow towards it.', 'Alternate sides at a steady rhythm.'],
  },

  // ── Dumbbell strength (2 × 5 kg) ──
  {
    id: 'db-floor-press', name: 'Dumbbell floor press', kind: 'strength', unit: 'reps', met: 5,
    how: ['Lie on your back, knees bent, a dumbbell in each hand above your chest.', 'Lower slowly (3 s) until your upper arms touch the floor at about 45° from your body.', 'Pause, then press back up.'],
    cue: 'Shoulder blades squeezed back into the floor.',
    spine: 'The floor supports your whole back — one of the safest presses there is.',
    harder: '1½ reps: lower, press halfway, lower again, press all the way.',
  },
  {
    id: 'db-row', name: 'One-arm dumbbell row', kind: 'strength', unit: 'reps', perSide: true, met: 4.5,
    how: ['One hand and knee on a chair or bed, back flat like a table.', 'Row the dumbbell to your hip, elbow close to your body.', 'Squeeze 1 s at the top, lower slowly to a full stretch.'],
    spine: 'Supported on one arm, your back stays neutral — no rounding.',
  },
  {
    id: 'seal-row', name: 'Chest-supported row (on the bed)', kind: 'strength', unit: 'reps', met: 4.5,
    how: ['Lie face down along the edge of your bed, a dumbbell in each hand hanging towards the floor.', 'Row both dumbbells up, squeezing your shoulder blades together.', 'Lower over 3 seconds to a full stretch.'],
    spine: 'Rowing with your chest supported builds the upper back with zero load on the spine.',
  },
  {
    id: 'db-ohp', name: 'Seated shoulder press (neutral grip)', kind: 'strength', unit: 'reps', met: 4.5,
    how: ['Sit tall against a wall or chair back, dumbbells at shoulder height, palms facing each other.', 'Press up until your arms are almost straight, slightly in front of your head.', 'Lower slowly to chin height.'],
    spine: 'If your lower back arches to get the weights up, press slightly forward instead of straight overhead.',
  },
  {
    id: 'lat-raise', name: 'Lateral raise', kind: 'strength', unit: 'reps', met: 3.5,
    how: ['Stand tall, dumbbells at your sides, a slight bend in the elbows.', 'Raise your arms out to the sides to shoulder height, leading with the elbows.', 'Lower over 3 seconds.'],
    cue: 'Push the dumbbells out, not up. Shoulders stay down, away from the ears.',
    harder: 'When strict reps run out, finish with half-reps from the bottom.',
  },
  {
    id: 'db-oh-ext', name: 'Overhead triceps extension', kind: 'strength', unit: 'reps', met: 3.5,
    how: ['Hold one dumbbell with both hands overhead, seated or standing.', 'Lower it behind your head by bending only the elbows.', 'Extend back up and squeeze the triceps.'],
    spine: 'Keep your ribs down — don’t let the lower back arch.',
  },
  {
    id: 'db-pullover', name: 'Dumbbell pullover (on the floor)', kind: 'strength', unit: 'reps', met: 3.5,
    how: ['Lie on your back, knees bent, one dumbbell held with both hands above your chest.', 'With slightly bent elbows, lower it back over your head as far as comfortable.', 'Pull it back over your chest using your lats.'],
    spine: 'Doubles as a stretch for the chest and upper back — good for posture.',
  },
  {
    id: 'reverse-fly', name: 'Reverse fly', kind: 'strength', unit: 'reps', met: 3.5,
    how: ['Lie face down on the bed edge (or hinge forward with a flat back), dumbbells hanging.', 'Raise your arms out to the sides, thumbs slightly up, squeezing the shoulder blades.', 'Lower slowly.'],
    spine: 'Rear shoulders and upper back hold you upright — your posture muscles.',
  },
  {
    id: 'db-curl', name: 'Dumbbell curl', kind: 'strength', unit: 'reps', met: 3.5,
    how: ['Stand tall, palms forward, elbows pinned to your sides.', 'Curl both dumbbells up without swinging.', 'Lower over 3 seconds.'],
    harder: 'Slower lowering (4 s), or 21s: 7 bottom-half, 7 top-half, 7 full reps.',
  },
  {
    id: 'hammer-curl', name: 'Hammer curl', kind: 'strength', unit: 'reps', met: 3.5,
    how: ['Palms facing each other, elbows at your sides.', 'Curl up, squeeze, lower slowly.'],
  },
  {
    id: 'close-pushup', name: 'Close-grip push-up', kind: 'strength', unit: 'reps', met: 4.5,
    how: ['Hands just under your shoulders, elbows tucked close to the ribs.', 'Lower with control, press up.'],
    easier: 'Hands on a bed or table (incline).',
  },
  {
    id: 'goblet-squat', name: 'Goblet squat', kind: 'strength', unit: 'reps', met: 5,
    how: ['Hold one dumbbell vertically at your chest — or both at your shoulders.', 'Sit down between your heels over 3 seconds, chest up, to a chair or as deep as is comfortable.', 'Pause 1 second at the bottom, then stand.'],
    spine: 'Holding the weight in front keeps your torso upright — kind to the back.',
    harder: '1½ reps: squat down, rise halfway, back down, then stand.',
  },
  {
    id: 'db-rdl', name: 'Dumbbell Romanian deadlift', kind: 'strength', unit: 'reps', met: 5,
    how: ['Hold both dumbbells in front of your thighs.', 'Push your hips back with soft knees, sliding the weights to mid-shin with a flat back (3 s down).', 'Stand up by squeezing your glutes.'],
    spine: 'Neutral spine always — the hinge ends where your back would start to round.',
  },
  {
    id: 'db-reverse-lunge', name: 'Dumbbell reverse lunge', kind: 'strength', unit: 'reps', perSide: true, met: 5,
    how: ['Dumbbells at your sides.', 'Step back and lower both knees to about 90°.', 'Drive through the front heel to stand.'],
    easier: 'Split squat holding a wall, no stepping.',
  },
  {
    id: 'bss', name: 'Bulgarian split squat', kind: 'strength', unit: 'reps', perSide: true, met: 5.5,
    how: ['Rear foot on a chair or bed behind you, dumbbells at your sides.', 'Lower straight down until the front thigh is near parallel.', 'Drive up through the front heel.'],
    spine: 'If hips or knees complain, shorten the range or put the rear foot back on the floor (split squat).',
  },
  {
    id: 'sl-rdl', name: 'Single-leg Romanian deadlift', kind: 'strength', unit: 'reps', perSide: true, met: 5,
    how: ['Stand on one leg with the other toes lightly on the floor behind (kickstand).', 'Hinge at the hip with a flat back, dumbbell in the opposite hand.', 'Stand by squeezing the glute of the working leg.'],
    easier: 'Hold a wall with your free hand.',
  },
  {
    id: 'db-hip-thrust', name: 'Dumbbell hip thrust', kind: 'strength', unit: 'reps', met: 5,
    how: ['Upper back on the edge of a sofa or bed, both dumbbells on your hips (on a folded towel).', 'Drive your hips up until your body is flat like a table; squeeze 2 seconds.', 'Lower slowly.'],
    cue: 'Chin tucked, ribs down — move at the hips, not the lower back.',
  },
  {
    id: 'sl-hip-thrust', name: 'Single-leg hip thrust', kind: 'strength', unit: 'reps', perSide: true, met: 5,
    how: ['Hip-thrust position, one foot lifted, a dumbbell on the working hip.', 'Drive up through the planted heel, squeeze 2 seconds.', 'Lower slowly.'],
  },
  {
    id: 'db-calf', name: 'Single-leg calf raise', kind: 'strength', unit: 'reps', perSide: true, met: 3.5,
    how: ['Stand on one foot on a step, holding a wall, dumbbell in the same-side hand.', 'Lower the heel fully, pause, rise as high as you can.'],
  },
  {
    id: 'weighted-dead-bug', name: 'Weighted dead bug', kind: 'core', unit: 'reps', perSide: true, met: 3.5,
    how: ['Lie on your back holding one dumbbell above your chest with both hands, knees bent at 90°.', 'Press your lower back into the floor and slowly extend one leg.', 'Return and switch legs; arms stay still.'],
    spine: 'Trains the abs to resist arching — the job they do to protect your spine.',
  },
  {
    id: 'mcgill-curlup', name: 'McGill curl-up (8-s holds)', kind: 'core', unit: 'reps', met: 3,
    how: ['Lie on your back, one knee bent, one leg straight, hands under your lower back.', 'Lift head and shoulders a few centimetres as one unit — no neck bending.', 'Hold 8 seconds, lower. Each hold is one rep.'],
    spine: 'Works the abs with minimal spinal bending — designed for sensitive backs.',
  },
  {
    id: 'suitcase-carry', name: 'Suitcase carry', kind: 'core', unit: 'sec', perSide: true, met: 4,
    how: ['Hold one dumbbell at your side.', 'Walk slowly (or stand) tall without leaning towards the weight.', 'Switch hands.'],
    spine: 'Your obliques work to keep you upright — real-world core strength.',
  },
  {
    id: 'reverse-crunch', name: 'Reverse crunch', kind: 'core', unit: 'reps', met: 3.5,
    how: ['Lie on your back, knees bent at 90°, hands by your sides.', 'Curl your hips off the floor, bringing knees towards your chest.', 'Lower over 3 seconds.'],
    spine: 'Slow and controlled. Skip it on days your lower back is sore.',
  },
  {
    id: 'hollow-hold', name: 'Tuck hollow hold', kind: 'core', unit: 'sec', met: 3.5,
    how: ['Lie on your back and press your lower back into the floor.', 'Lift shoulders and bent knees slightly, arms reaching forward.', 'Hold, breathing steadily.'],
    harder: 'Straighten the legs a little more each week.',
  },

  // ── Low-impact cardio (nothing leaves the floor) ──
  {
    id: 'march', name: 'High-knee march', kind: 'cardio', unit: 'sec', met: 4,
    how: ['March on the spot, lifting knees towards hip height.', 'Pump your arms. No jumping — one foot is always on the floor.'],
  },
  {
    id: 'step-jack', name: 'Step-out jacks', kind: 'cardio', unit: 'sec', met: 4.5,
    how: ['Step one foot out to the side while raising both arms overhead.', 'Step back in, then out to the other side.'],
    cue: 'A jumping jack without the jump.',
  },
  {
    id: 'shadow-box', name: 'Shadow boxing', kind: 'cardio', unit: 'sec', met: 5,
    how: ['Soft knees, light on your feet.', 'Throw straight punches and hooks into the air, rotating through your trunk.'],
    spine: 'The trunk rotation doubles as mobility work.',
  },
  {
    id: 'skater', name: 'Skater steps', kind: 'cardio', unit: 'sec', met: 5,
    how: ['Step wide to one side, swinging the back leg behind you like a speed skater.', 'Step across to the other side. Keep it low-impact.'],
  },
  {
    id: 'heel-tap', name: 'Standing butt kicks', kind: 'cardio', unit: 'sec', met: 4,
    how: ['Walk on the spot, bringing each heel up towards your glutes.', 'Keep it brisk and rhythmic.'],
  },
  {
    id: 'front-kick', name: 'Standing front kicks', kind: 'cardio', unit: 'sec', met: 4.5,
    how: ['Stand tall with fists up.', 'Lift one knee and extend a controlled kick forward, alternating legs.'],
  },
  {
    id: 'brisk-walk', name: 'Brisk walk', kind: 'cardio', unit: 'sec', met: 4.3,
    how: ['Walk at a pace where talking is possible but singing is not.', 'Tall posture, relaxed shoulders, arms swinging.'],
    spine: 'Walking is one of the best things you can do for a stiff spine. Pick flat routes on painful days.',
  },
]

export const EX = Object.fromEntries(EXERCISES.map((e) => [e.id, e])) as Record<string, Exercise>

export const youtubeHow = (name: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' exercise proper form')}`
