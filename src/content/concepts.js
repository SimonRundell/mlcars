/**
 * Teaching content for the Concepts drawer (BUILD.md section 7). Plain
 * data on purpose, so the wording can be edited without touching any
 * component. UK English, plain words first, the correct term introduced
 * in bold the first time it appears.
 *
 * @typedef {Object} Concept
 * @property {string} id Short stable id, used as the React key and for de-duplicating unlock notices.
 * @property {string} title
 * @property {'L2'|'L3'|'T'} level NCFE Level 2 / BTec-T-Level Level 3 / T-Level maths-and-vocabulary depth tag, for the teacher's own mapping.
 * @property {string} plain 2 to 4 short sentences, Level 2 reading level.
 * @property {string} deeper The Level 3 detail, hidden behind a "Go deeper" button.
 * @property {string} ask One discussion question for the class.
 * @property {ConceptTrigger} trigger The event that unlocks this card.
 */

/**
 * @typedef {'appOpened'|'roundStarted'|'carStopped'|'roundEnded'|'rewindPointReached'|'backtrack'|'lapCompleted'|'secondRound'|'learningReset'|'carCollision'|'trackChanged'|'phase3'} ConceptTrigger
 */

/** @type {Concept[]} */
export const CONCEPTS = [
  {
    id: 'agent-environment',
    title: 'The agent and the environment',
    level: 'L2',
    plain:
      'Each car is the thing making decisions. In this kind of system that is called the **agent**. Everything else, the track, the walls and the other cars, is the **environment**. The agent acts, the environment responds, and that response is the only feedback the agent ever gets.',
    deeper:
      'This split between agent and environment is the basic shape of **reinforcement learning**. The agent is never told the right answer. It only gets to act and then observe what happened, round after round. Robots learning to walk and computer game players are often built this same way.',
    ask: 'What is the "environment" for a person learning to ride a bicycle?',
    trigger: 'appOpened',
  },
  {
    id: 'actions',
    title: 'Actions: nine possible moves',
    level: 'L2',
    plain:
      'Each car picks one move at a time from a fixed list: speed up, hold speed or slow down, combined with steering left, straight or right. That is three throttle choices times three steering choices, nine **actions** in total. The car cannot do anything that is not on this list.',
    deeper:
      'Giving an agent a small, fixed set of actions is a common simplifying choice. Real driving has a continuous range of speeds and steering angles, but nine clear options make it possible to watch exactly what a car tried and compare it, step by step, with what it tried last time.',
    ask: 'Why might having only nine choices make learning easier, compared with having unlimited ones?',
    trigger: 'roundStarted',
  },
  {
    id: 'reward',
    title: 'Reward: distance as a score',
    level: 'L2',
    plain:
      'Every round, a car is scored by how far it got round the track before it stopped. That score is its **reward**. Further is always better, whatever happened along the way.',
    deeper:
      'Choosing the right reward matters a great deal in real systems. A poorly chosen reward can be "gamed" by an agent in ways nobody intended. Distance is a safe, simple choice here because going further always requires actually driving well.',
    ask: 'Can you think of a reward for this task that sounds reasonable but would actually be a bad choice?',
    trigger: 'carStopped',
  },
  {
    id: 'trial-and-error',
    title: 'Trial and error, and the episode',
    level: 'L2',
    plain:
      'At the start, the car knows nothing. It tries a move, sees what happens, and remembers. If it crashes, that choice goes on the "do not do that again" list. Each round is one attempt from the start line to the crash.',
    deeper:
      'One attempt from start to finish is called an **episode**. The car\'s score for an episode is its **reward**, here the distance it covered. Learning means using the rewards from past episodes to pick better actions in future ones.',
    ask: 'Why do the cars start in exactly the same place every round?',
    trigger: 'roundEnded',
  },
  {
    id: 'explore-exploit',
    title: 'Exploring and exploiting',
    level: 'L2',
    plain:
      'A car can do two things with a move it already knows works: keep doing it, or try something different in case there is something better. Repeating what already works is called **exploiting**. Trying something new is called **exploring**. A car locks in the start of its best route and explores only from the point it has not yet beaten.',
    deeper:
      'Balancing exploration and exploitation is one of the central problems in reinforcement learning. Explore too little and the agent gets stuck with an early, mediocre route. Explore too much and it never settles on anything good. Here the balance is set by the **rewind** distance and the **stickiness** setting.',
    ask: 'If a car only ever explored and never locked anything in, what would happen to its progress?',
    trigger: 'rewindPointReached',
  },
  {
    id: 'why-rewind',
    title: 'Why rewind before the crash',
    level: 'L2',
    plain:
      'The wall is not always to blame. A move a few steps earlier may have pointed the car at the wall for good. So the car goes back a little before the crash and changes its mind there. If that keeps failing, it goes back further.',
    deeper:
      'This is the **credit assignment problem**: deciding which earlier decision deserves the blame for a later result. Rewinding is a simple, visible way to handle it. Real systems use methods such as temporal difference learning, which spread the blame across many earlier steps at once.',
    ask: 'Can you think of a time a small mistake early on caused a big problem later?',
    trigger: 'rewindPointReached',
  },
  {
    id: 'backtracking',
    title: 'Backtracking when stuck',
    level: 'L2',
    plain:
      'Sometimes trying every move at the rewind point still is not enough. The car has tried all nine moves there and still crashes. When that happens, it gives up on that point and goes back to change its mind even earlier. This is called **backtracking**. If it keeps crashing in almost exactly the same spot no matter which move it tries, that is a strong clue the real mistake is further back still, so it jumps back several steps at once instead of just one.',
    deeper:
      'Backtracking only happens after `patience` rounds of failing at the same point, or once all nine actions have been tried there. A normal backtrack goes back one step. A **same-spot** backtrack, where every recent crash from this point landed within a few metres of the others, goes back `bigRewindJump` steps in one go. This stops a car giving up too early on a point that might still work with a bit more luck from where the other cars happen to be, and stops it wasting dozens of rounds nudging back one step at a time towards a wall it was always going to hit.',
    ask: 'Why might it take several failed attempts before a car decides to backtrack further, rather than backtracking straight away?',
    trigger: 'backtrack',
  },
  {
    id: 'two-goals-survive-and-quick',
    title: 'Two goals, not one: surviving and being quick',
    level: 'L2',
    plain:
      'At first, a car only cares about going further without crashing. Once it can get all the way round a lap, a second goal switches on: can it do that same lap in fewer steps? A round that covers the same distance more quickly now also counts as an improvement, even if it did not go any further than before.',
    deeper:
      'This is a small example of **reward shaping**: changing what counts as "better" partway through learning, once the easier goal is secure. The car is not told to drive faster directly. It only gets to keep a faster route if it happens to find one while exploring, in exactly the same trial-and-error way it found a route that survived in the first place. Turn this off in Settings ("Optimize for speed once a lap is secure") to watch cars that only ever care about surviving, for comparison.',
    ask: 'Why might it make sense to teach "do not crash" before teaching "go faster", rather than both at once from round one?',
    trigger: 'lapCompleted',
  },
  {
    id: 'learning-curve',
    title: 'The learning curve (reading the chart)',
    level: 'L3',
    plain:
      'The Learning chart drawer draws a line for each car: its best distance so far, round by round. A line that climbs means that car is improving. A line that goes flat means it has stopped finding anything better, at least for now.',
    deeper:
      'This kind of plot is called a **learning curve**. In most real machine learning it climbs quickly at first, then levels off as the easy gains run out and only small improvements remain. A flat learning curve does not always mean learning has stopped completely. It can mean a car is stuck and needs to backtrack further, or that it has found the best route this method can find.',
    ask: 'What would it mean if one car\'s line levelled off much earlier than the others?',
    trigger: 'secondRound',
  },
  {
    id: 'randomness-seeds',
    title: 'Randomness, seeds and why runs differ',
    level: 'L2',
    plain:
      'Every "random" choice the cars make, such as which untried move to pick, actually comes from a number called a **seed**. The same seed, on the same track, always produces exactly the same rounds, decisions and crashes, every single time. A different seed gives different randomness, and so a different history, even though the rules are identical.',
    deeper:
      'Code that behaves this way is called **deterministic** given its seed. This matters for testing and for fairness: it is the only way to be sure a change you made actually caused a difference, rather than the randomness simply landing differently this time. Use "New seed" in Settings to see a fresh run from scratch.',
    ask: 'If two people ran this app with the same seed and the same track, should they see exactly the same thing happen? Why?',
    trigger: 'learningReset',
  },
  {
    id: 'other-cars-environment',
    title: 'Other cars as part of the environment',
    level: 'L2',
    plain:
      'A car is not just learning the track. It is also learning around five other cars that are themselves still learning and changing their behaviour round by round. A route that worked perfectly on an empty track can fail if another car happens to be in the way this time.',
    deeper:
      'An environment that changes because other agents are also acting in it is called **non-stationary**. It is much harder to learn in than a fixed environment, because the "right" answer can stop being right without the agent doing anything differently. This is why a car\'s distance in a round can sometimes be worse than its best, purely because of traffic.',
    ask: 'Why might it be harder for a car to learn with five other learning cars on the track, compared with learning completely alone?',
    trigger: 'carCollision',
  },
  {
    id: 'six-learners-differ',
    title: 'Why six independent learners give six different results',
    level: 'L2',
    plain:
      'All six cars follow exactly the same rules. None of them copies another, and none shares what it has learned. Even so, after a few rounds they usually have different best distances and different routes. That difference comes entirely from randomness, and from where the other cars happened to be each round.',
    deeper:
      'This shows that outcome depends on more than just the rules an agent follows. Two agents with identical learning rules can end up in quite different places. It is one reason real machine learning experiments are usually repeated several times before anyone trusts the result.',
    ask: 'If you ran this experiment again with a new seed, would you expect the same car to come out ahead? Why or why not?',
    trigger: 'secondRound',
  },
  {
    id: 'overfitting',
    title: 'It only works on this track',
    level: 'L2',
    plain:
      'The cars have memorised a list of moves that suits this one track. Change the track and the list is useless. A skill that carries over to new places would be much more useful.',
    deeper:
      'A model that does very well on the data it trained on and badly on anything new is **overfitting**. Here the "model" is a stored route, so it is overfitted by design. The sensor cars in Phase 3 try to learn a skill instead of a route.',
    ask: 'What would a car need to know in order to drive a track it has never seen?',
    trigger: 'trackChanged',
  },
  {
    id: 'sensors-networks',
    title: 'Sensors and neural networks',
    level: 'T',
    plain:
      'Instead of memorising a list of moves, a sensor car looks at its surroundings on every step: how far is the wall ahead and to each side, and how fast is it going right now? Those readings feed into a small **neural network**, which decides the next move from what it currently sees, not from a stored list.',
    deeper:
      'A neural network is a set of simple calculations, called **nodes**, arranged in layers and connected by **weights**. Each node takes in numbers, combines them, and passes a result on. Because the decision comes from what the car currently senses rather than a memorised step number, the same network can, in principle, be reused on a track it has never driven.',
    ask: 'What is the key difference between a route car\'s decision at step 40 and a sensor car\'s decision at the same point?',
    trigger: 'phase3',
  },
  {
    id: 'weights-mutation',
    title: 'Weights and mutation',
    level: 'T',
    plain:
      'A sensor car\'s network has a set of numbers called **weights** that control how strongly each sensor reading affects its decision. Each round, a car tries driving with its weights changed by a small, random amount. If it gets further than its parent did, the changed weights become the new parent for next time.',
    deeper:
      'This process is called **mutation and selection**: small random changes, kept only when they help. It is a simple form of **evolutionary learning**, related to the general idea of natural selection. Unlike the route method, it never looks back over a car\'s whole history. It only ever compares the current attempt with its most recent parent.',
    ask: 'What might go wrong if the random changes to the weights were allowed to be very large instead of small?',
    trigger: 'phase3',
  },
  {
    id: 'sensor-transfer',
    title: 'Why the sensor cars can try a new track',
    level: 'T',
    plain:
      'A route car has only memorised where to steer at each step number. Put it on a new track and those step numbers mean nothing. A sensor car instead learned to react to what its sensors show it right now. A wall ahead means much the same thing whatever track it is on, so a sensor car has a real chance of coping.',
    deeper:
      'This is the practical payoff of learning a general skill instead of a specific route: it can **transfer**. Transfer is never perfect. A network trained only on gentle curves may still struggle with a much tighter hairpin than anything it met in training. The Transfer test button in Phase 3 makes this comparison directly, putting both kinds of car on an unfamiliar track with learning switched off.',
    ask: 'Why might a sensor car trained only on the Oval still struggle the first time it meets Suzuka?',
    trigger: 'phase3',
  },
];

/**
 * Look up a concept by id.
 *
 * @param {string} id
 * @returns {Concept|undefined}
 */
export function getConceptById(id) {
  return CONCEPTS.find((c) => c.id === id);
}
