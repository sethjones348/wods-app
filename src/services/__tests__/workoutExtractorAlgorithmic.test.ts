import { parseWorkoutFromRawText } from '../workoutExtractorAlgorithmic';

describe('workoutExtractorAlgorithmic', () => {
    describe('parseWorkoutFromRawText', () => {
        // Test cases from existing raw text files
        const testCases = [
            {
                name: 'WhiteboardPic1 - AMRAP',
                rawText: `AMRAP | | 10 min
30 | DU |
10 | bike | cal
8 | + | 25 | 11/16/25`,
                expected: {
                    title: 'AMRAP 10 min',
                    description: 'An AMRAP with Double Unders and Bike.',
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Bike',
                                unit: 'cal',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '8 + 25',
                            metadata: {
                                rounds: 8,
                                repsIntoNextRound: 25,
                                totalReps: 33,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'WhiteboardPic2 - 4 Rounds For Time (reversed format)',
                rawText: `4 rds | Time
15 | cal | ski:
30 | ca | Bike
25 | CTB
30 | cal | Bike
25:55 | 11/9/25`,
                expected: {
                    title: '4 rds Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Ski',
                                unit: 'cal',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Bike',
                                unit: 'cal',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '25',
                                exercise: 'Ctb',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Bike',
                                unit: 'cal',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '25:55',
                            metadata: {
                                timeInSeconds: 1555,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'WhiteboardPic2 - 4 Rounds For Time',
                rawText: `4 rds | Time |
15 | ski: | cal
30 | Bike | cal
25 | CTB |
30 | Bike | cal
25:55 | | | 11/9/25`,
                expected: {
                    title: '4 rds Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Ski',
                                unit: 'cal',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Bike',
                                unit: 'cal',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '25',
                                exercise: 'Ctb',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Bike',
                                unit: 'cal',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '25:55',
                            metadata: {
                                timeInSeconds: 1555,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'WhiteboardPic3 - For Time with Rest (reversed format)',
                rawText: `for | Time
20 | WB
10 | BJO 24"
1:00 | rest
40 | WB
20 | BJO 24"
1:00 | rest
60 | WB
30 | BJO 24"
11/19/23 | 7:54`,
                expected: {
                    title: 'for Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Wall Ball',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Bjo 24"',
                                unit: null,
                            },
                        },
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: '1:00 rest',
                                type: 'rest',
                                duration: 60,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '40',
                                exercise: 'Wall Ball',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Bjo 24"',
                                unit: null,
                            },
                        },
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: '1:00 rest',
                                type: 'rest',
                                duration: 60,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '60',
                                exercise: 'Wall Ball',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Bjo 24"',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '7:54',
                            metadata: {
                                timeInSeconds: 474,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'WhiteboardPic6 - Rounds with Time Cap',
                rawText: `10 rds | 11:00 CAP
10 deadlift | 135
30 DU
9 rds | @ | 11min`,
                expected: {
                    title: '10 rds 11:00 CAP',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Deadlift',
                                unit: '135',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Time Cap',
                            type: 'reps',
                            value: '9 rds @ 11min',
                            metadata: {
                                repsIntoNextRound: undefined,
                                rounds: 9,
                                totalReps: expect.any(Number),
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'WhiteboardPic8 - Pyramid/Ladder Rep Scheme',
                rawText: `for time
1-2-3-4-5-5-4-3-2-1
Cleans | 185
30 DU | after each set
8:15`,
                expected: {
                    title: 'for time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '1-2-3-4-5-5-4-3-2-1',
                                exercise: 'Clean',
                                unit: '185',
                            },
                        },
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: '30 DU after each set',
                                type: 'instruction',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '1',
                            metadata: {
                                totalReps: 1,
                            },
                        },
                        {
                            name: 'Round 1',
                            type: 'reps',
                            value: 'Cleans 185',
                            metadata: {
                                repsIntoNextRound: undefined,
                                rounds: undefined,
                                totalReps: 185,
                            },
                        },
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '8:15',
                            metadata: {
                                timeInSeconds: 495,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'WhiteboardPic9 - Sets with Building',
                rawText: `4 Sets | x | 8 Reps
-building
- 2:00 | Clock
3 Sets
10 Strict | HSPU
30/24 Cal Echo | 13:09
15 Kipping | HSPU
-rest | 3:00 | btwn-`,
                expected: {
                    title: '4 Sets x 8 Reps',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: '-building',
                                type: 'instruction',
                            },
                        },
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: '- 2:00 Clock',
                                type: 'instruction',
                            },
                        },
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: '3 Sets',
                                type: 'instruction',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Strict Hspu',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '1',
                                exercise: '30/24 Cal Echo 13:09',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Kipping Hspu',
                                unit: null,
                            },
                        },
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: '-rest 3:00 btwn-',
                                type: 'instruction',
                                duration: 180,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '13:09',
                            metadata: {
                                timeInSeconds: 789,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'WhiteboardPic3 - For Time with Rest',
                rawText: `for time
20 | WB |
10 | BJO | 24"
rest | 1:00 |
40 | WB |
20 | BJO | 24"
rest | 1:00 |
60 | WB |
30 | BJO | 24"
11/19/23 | 7:54 |`,
                expected: {
                    title: 'for time',
                    description: 'A For Time with Wall Ball and Bjo.',
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Wall Ball',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Bjo',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: 'rest 1:00',
                                type: 'rest',
                                duration: 60,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '40',
                                exercise: 'Wall Ball',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Bjo',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: 'rest 1:00',
                                type: 'rest',
                                duration: 60,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '60',
                                exercise: 'Wall Ball',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Bjo',
                                unit: '24"',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '7:54',
                            metadata: {
                                timeInSeconds: 474,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'WhiteboardPic4 - E5 MOM',
                rawText: `£5 MOM
10 | |
10 | RMU |
8 | |
8 | + 80 rpm bike nasal |
8 | |
6 | |
Date | 11/18/25 |`,
                expected: {
                    title: 'E5 MOM',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Rmu',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '10',
                            metadata: {
                                totalReps: 10,
                            },
                        },
                        {
                            name: 'Round 1',
                            type: 'reps',
                            value: '8',
                            metadata: {
                                totalReps: 8,
                            },
                        },
                        {
                            name: 'Round 2',
                            type: 'reps',
                            value: '8',
                            metadata: {
                                totalReps: 8,
                            },
                        },
                        {
                            name: 'Round 3',
                            type: 'reps',
                            value: '6',
                            metadata: {
                                totalReps: 6,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'WhiteboardPic11 - ESMOM',
                rawText: `ESMOM
10 | RMU |
20 | WB | 30lbs
200W | Bike erg |
1:38 |
2:22 |
2:59 |
3:42 |
4:09 |`,
                expected: {
                    title: 'ESMOM',
                    description: 'A workout with Rmu and Wall Ball.',
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Rmu',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Wall Ball',
                                unit: '30lbs',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '1',
                                exercise: '200w Bike Erg',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Round 1',
                            type: 'time',
                            value: '1:38',
                            metadata: {
                                timeInSeconds: 98,
                            },
                        },
                        {
                            name: 'Round 2',
                            type: 'time',
                            value: '2:22',
                            metadata: {
                                timeInSeconds: 142,
                            },
                        },
                        {
                            name: 'Round 3',
                            type: 'time',
                            value: '2:59',
                            metadata: {
                                timeInSeconds: 179,
                            },
                        },
                        {
                            name: 'Round 4',
                            type: 'time',
                            value: '3:42',
                            metadata: {
                                timeInSeconds: 222,
                            },
                        },
                        {
                            name: 'Round 5',
                            type: 'time',
                            value: '4:09',
                            metadata: {
                                timeInSeconds: 249,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'WhiteboardPic10 - 3 Rounds with @ symbol',
                rawText: `3rds |
12 | Cal row |
10 | TTB |
8 | BJO | 30"
@ | 8:00 |
13 45 |
for time |
) | :54 |
36 | cal |
30 | TTB |
24 | BJO | 30"`,
                expected: {
                    title: '3rds',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Toes-to-Bar',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '8',
                                exercise: 'Bjo',
                                unit: '30"',
                            },
                        },
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: '@ 8:00',
                                type: 'instruction',
                                duration: 480,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '13',
                                exercise: '45',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '1',
                                exercise: 'For Time',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '1',
                                exercise: ') :54',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '36',
                                exercise: 'Cal',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Toes-to-Bar',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '24',
                                exercise: 'Bjo',
                                unit: '30"',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: ') :54',
                            metadata: {
                                repsIntoNextRound: undefined,
                                rounds: undefined,
                                totalReps: expect.any(Number),
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
        ];

        testCases.forEach(({ name, rawText, expected }) => {
            it(`should parse ${name} correctly`, () => {
                const result = parseWorkoutFromRawText(rawText);
                expect(result).toMatchObject(expected);
            });
        });

        // Test cases for example-photos (generated sample raw text)
        const examplePhotoTestCases = [
            {
                name: 'ExampleWorkout - Basic AMRAP',
                rawText: `AMRAP | | 12 min
21 | Thrusters | 95
15 | Pull-ups |
9 | Burpees |`,
                expected: {
                    title: 'AMRAP 12 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '21',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '9',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8158 - Image 1 - EMOM',
                rawText: `E2MOM | | 20 min
5 | Power Cleans | 135
10 | Box Jumps | 24"
15 | Cal Row |`,
                expected: {
                    title: 'E2MOM 20 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '5',
                                exercise: 'Power Clean',
                                unit: '135',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8158 - Image 2 - AMRAP with Score',
                rawText: `AMRAP | | 12 min
21 | Thrusters | 95
15 | Pull-ups |
9 | Burpees |
7 | + | 18 |`,
                expected: {
                    title: 'AMRAP 12 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '21',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '9',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '7 + 18',
                            metadata: {
                                rounds: 7,
                                repsIntoNextRound: 18,
                                totalReps: 25,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8158 - Image 3 - For Time',
                rawText: `For Time
30 | Wall Balls | 20
20 | KB Swings | 53
10 | Box Jumps | 24"
8:15 |`,
                expected: {
                    title: 'For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Wall Ball',
                                unit: '20',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Kettlebell Swing',
                                unit: '53',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '8:15',
                            metadata: {
                                timeInSeconds: 495,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8158 - Image 4 - EMOM with Rounds',
                rawText: `E3MOM | | 15 min
8 | Cal Row |
6 | Thrusters | 95
4 | Pull-ups |
1:25 |
1:30 |
1:28 |
1:32 |
1:27 |`,
                expected: {
                    title: 'E3MOM 15 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '8',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '6',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '4',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Round 1',
                            type: 'time',
                            value: '1:25',
                            metadata: {
                                timeInSeconds: 85,
                            },
                        },
                        {
                            name: 'Round 2',
                            type: 'time',
                            value: '1:30',
                            metadata: {
                                timeInSeconds: 90,
                            },
                        },
                        {
                            name: 'Round 3',
                            type: 'time',
                            value: '1:28',
                            metadata: {
                                timeInSeconds: 88,
                            },
                        },
                        {
                            name: 'Round 4',
                            type: 'time',
                            value: '1:32',
                            metadata: {
                                timeInSeconds: 92,
                            },
                        },
                        {
                            name: 'Round 5',
                            type: 'time',
                            value: '1:27',
                            metadata: {
                                timeInSeconds: 87,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8158 - Image 5 - Rounds with Rest',
                rawText: `3 Rounds | For Time
15 | Deadlifts | 225
12 | Double Unders |
9 | Handstand Push-ups |
rest | 1:00 |
14:32 |`,
                expected: {
                    title: '3 Rounds For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Deadlift',
                                unit: '225',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '9',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: 'rest 1:00',
                                type: 'rest',
                                duration: 60,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '14:32',
                            metadata: {
                                timeInSeconds: 872,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8158 - Image 6 - Simple AMRAP',
                rawText: `AMRAP | | 10 min
12 | Burpees |
8 | Pull-ups |
6 | Handstand Push-ups |`,
                expected: {
                    title: 'AMRAP 10 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '8',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '6',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8159 - Image 1 - For Time',
                rawText: `For Time
50 | Wall Balls | 20
40 | KB Swings | 53
30 | Box Jumps | 24"
20 | Pull-ups |
10 | Burpees |
12:45 |`,
                expected: {
                    title: 'For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '50',
                                exercise: 'Wall Ball',
                                unit: '20',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '40',
                                exercise: 'Kettlebell Swing',
                                unit: '53',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '12:45',
                            metadata: {
                                timeInSeconds: 765,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8159 - Image 2 - AMRAP',
                rawText: `AMRAP | | 15 min
18 | Thrusters | 95
12 | Pull-ups |
9 | Burpees |`,
                expected: {
                    title: 'AMRAP 15 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '18',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '9',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8159 - Image 3 - EMOM',
                rawText: `E4MOM | | 16 min
6 | Power Cleans | 135
10 | Box Jumps | 24"
12 | Cal Row |`,
                expected: {
                    title: 'E4MOM 16 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '6',
                                exercise: 'Power Clean',
                                unit: '135',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8159 - Image 4 - Chipper',
                rawText: `Chipper | For Time
80 | Double Unders |
60 | Sit-ups |
40 | Air Squats |
20 | Push-ups |
10 | Pull-ups |
11:22 |`,
                expected: {
                    title: 'Chipper For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '80',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '60',
                                exercise: 'Sit-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '40',
                                exercise: 'Air Squats',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Push-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '11:22',
                            metadata: {
                                timeInSeconds: 682,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8159 - Image 5 - Rounds for Time',
                rawText: `4 Rounds | For Time
12 | Deadlifts | 225
15 | Double Unders |
9 | Handstand Push-ups |
16:45 |`,
                expected: {
                    title: '4 Rounds For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Deadlift',
                                unit: '225',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '9',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '16:45',
                            metadata: {
                                timeInSeconds: 1005,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8159 - Image 6 - AMRAP with Score',
                rawText: `AMRAP | | 12 min
15 | Cal Row |
12 | Thrusters | 75
9 | Pull-ups |
6 | + | 12 |`,
                expected: {
                    title: 'AMRAP 12 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Thruster',
                                unit: '75',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '9',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '6 + 12',
                            metadata: {
                                rounds: 6,
                                repsIntoNextRound: 12,
                                totalReps: 18,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8160 - Image 1 - Rounds for Time',
                rawText: `5 Rounds | For Time
10 | Deadlifts | 225
20 | Double Unders |
15 | Handstand Push-ups |
18:32 |`,
                expected: {
                    title: '5 Rounds For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Deadlift',
                                unit: '225',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '18:32',
                            metadata: {
                                timeInSeconds: 1112,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8160 - Image 2 - EMOM',
                rawText: `E3MOM | | 18 min
9 | Cal Row |
7 | Thrusters | 95
5 | Pull-ups |`,
                expected: {
                    title: 'E3MOM 18 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '9',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '7',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '5',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8160 - Image 3 - For Time',
                rawText: `For Time
40 | Wall Balls | 20
30 | KB Swings | 53
20 | Box Jumps | 24"
10:15 |`,
                expected: {
                    title: 'For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '40',
                                exercise: 'Wall Ball',
                                unit: '20',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Kettlebell Swing',
                                unit: '53',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '10:15',
                            metadata: {
                                timeInSeconds: 615,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8160 - Image 4 - AMRAP',
                rawText: `AMRAP | | 14 min
20 | Thrusters | 95
15 | Pull-ups |
10 | Burpees |`,
                expected: {
                    title: 'AMRAP 14 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8160 - Image 5 - EMOM with Times',
                rawText: `E5MOM | | 20 min
8 | Cal Row |
6 | Thrusters | 95
4 | Pull-ups |
1:20 |
1:18 |
1:22 |
1:19 |`,
                expected: {
                    title: 'E5MOM 20 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '8',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '6',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '4',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Round 1',
                            type: 'time',
                            value: '1:20',
                            metadata: {
                                timeInSeconds: 80,
                            },
                        },
                        {
                            name: 'Round 2',
                            type: 'time',
                            value: '1:18',
                            metadata: {
                                timeInSeconds: 78,
                            },
                        },
                        {
                            name: 'Round 3',
                            type: 'time',
                            value: '1:22',
                            metadata: {
                                timeInSeconds: 82,
                            },
                        },
                        {
                            name: 'Round 4',
                            type: 'time',
                            value: '1:19',
                            metadata: {
                                timeInSeconds: 79,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8160 - Image 6 - Chipper',
                rawText: `Chipper | For Time
90 | Double Unders |
70 | Sit-ups |
50 | Air Squats |
30 | Push-ups |
10 | Pull-ups |
13:45 |`,
                expected: {
                    title: 'Chipper For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '90',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '70',
                                exercise: 'Sit-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '50',
                                exercise: 'Air Squats',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Push-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '13:45',
                            metadata: {
                                timeInSeconds: 825,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8161 - Image 1 - AMRAP with Score',
                rawText: `AMRAP | | 15 min
10 | Cal Row |
15 | Thrusters | 75
20 | Pull-ups |
5 | + | 12`,
                expected: {
                    title: 'AMRAP 15 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Thruster',
                                unit: '75',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '5 + 12',
                            metadata: {
                                rounds: 5,
                                repsIntoNextRound: 12,
                                totalReps: 17,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8161 - Image 2 - For Time',
                rawText: `For Time
35 | Wall Balls | 20
25 | KB Swings | 53
15 | Box Jumps | 24"
9:30 |`,
                expected: {
                    title: 'For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '35',
                                exercise: 'Wall Ball',
                                unit: '20',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '25',
                                exercise: 'Kettlebell Swing',
                                unit: '53',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '9:30',
                            metadata: {
                                timeInSeconds: 570,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8161 - Image 3 - EMOM',
                rawText: `E2MOM | | 14 min
7 | Power Cleans | 135
12 | Box Jumps | 24"
14 | Cal Row |`,
                expected: {
                    title: 'E2MOM 14 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '7',
                                exercise: 'Power Clean',
                                unit: '135',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '14',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8161 - Image 4 - Rounds for Time',
                rawText: `4 Rounds | For Time
11 | Deadlifts | 225
18 | Double Unders |
12 | Handstand Push-ups |
15:45 |`,
                expected: {
                    title: '4 Rounds For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '11',
                                exercise: 'Deadlift',
                                unit: '225',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '18',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '15:45',
                            metadata: {
                                timeInSeconds: 945,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8161 - Image 5 - AMRAP',
                rawText: `AMRAP | | 12 min
16 | Thrusters | 95
12 | Pull-ups |
8 | Burpees |`,
                expected: {
                    title: 'AMRAP 12 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '16',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '8',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8161 - Image 6 - Chipper',
                rawText: `Chipper | For Time
75 | Double Unders |
55 | Sit-ups |
35 | Air Squats |
15 | Pull-ups |
10:30 |`,
                expected: {
                    title: 'Chipper For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '75',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '55',
                                exercise: 'Sit-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '35',
                                exercise: 'Air Squats',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '10:30',
                            metadata: {
                                timeInSeconds: 630,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8162 - Image 1 - EMOM with Rest',
                rawText: `E3MOM | | 18 min
12 | Cal Row |
9 | Thrusters | 95
Rest | | 1:00
6 | + | 8 |`,
                expected: {
                    title: 'E3MOM 18 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '9',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: 'Rest 1:00',
                                type: 'rest',
                                duration: 60,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '6 + 8',
                            metadata: {
                                rounds: 6,
                                repsIntoNextRound: 8,
                                totalReps: 14,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8162 - Image 2 - For Time',
                rawText: `For Time
45 | Wall Balls | 20
35 | KB Swings | 53
25 | Box Jumps | 24"
11:15 |`,
                expected: {
                    title: 'For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '45',
                                exercise: 'Wall Ball',
                                unit: '20',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '35',
                                exercise: 'Kettlebell Swing',
                                unit: '53',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '25',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '11:15',
                            metadata: {
                                timeInSeconds: 675,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8162 - Image 3 - AMRAP',
                rawText: `AMRAP | | 16 min
19 | Thrusters | 95
14 | Pull-ups |
11 | Burpees |`,
                expected: {
                    title: 'AMRAP 16 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '19',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '14',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '11',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8162 - Image 4 - EMOM',
                rawText: `E4MOM | | 16 min
8 | Power Cleans | 135
11 | Box Jumps | 24"
13 | Cal Row |`,
                expected: {
                    title: 'E4MOM 16 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '8',
                                exercise: 'Power Clean',
                                unit: '135',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '11',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '13',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8162 - Image 5 - Rounds for Time',
                rawText: `3 Rounds | For Time
13 | Deadlifts | 225
22 | Double Unders |
11 | Handstand Push-ups |
13:22 |`,
                expected: {
                    title: '3 Rounds For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '13',
                                exercise: 'Deadlift',
                                unit: '225',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '22',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '11',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '13:22',
                            metadata: {
                                timeInSeconds: 802,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8162 - Image 6 - AMRAP with Score',
                rawText: `AMRAP | | 13 min
11 | Cal Row |
13 | Thrusters | 75
17 | Pull-ups |
4 | + | 15 |`,
                expected: {
                    title: 'AMRAP 13 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '11',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '13',
                                exercise: 'Thruster',
                                unit: '75',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '17',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '4 + 15',
                            metadata: {
                                rounds: 4,
                                repsIntoNextRound: 15,
                                totalReps: 19,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8163 - Image 1 - Chipper',
                rawText: `Chipper | For Time
100 | Double Unders |
80 | Sit-ups |
60 | Air Squats |
40 | Push-ups |
20 | Pull-ups |
15:22 |`,
                expected: {
                    title: 'Chipper For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '100',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '80',
                                exercise: 'Sit-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '60',
                                exercise: 'Air Squats',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '40',
                                exercise: 'Push-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '15:22',
                            metadata: {
                                timeInSeconds: 922,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8163 - Image 2 - For Time',
                rawText: `For Time
55 | Wall Balls | 20
45 | KB Swings | 53
35 | Box Jumps | 24"
13:30 |`,
                expected: {
                    title: 'For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '55',
                                exercise: 'Wall Ball',
                                unit: '20',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '45',
                                exercise: 'Kettlebell Swing',
                                unit: '53',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '35',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '13:30',
                            metadata: {
                                timeInSeconds: 810,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8163 - Image 3 - AMRAP',
                rawText: `AMRAP | | 18 min
22 | Thrusters | 95
17 | Pull-ups |
13 | Burpees |`,
                expected: {
                    title: 'AMRAP 18 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '22',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '17',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '13',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8163 - Image 4 - EMOM',
                rawText: `E3MOM | | 17 min
10 | Power Cleans | 135
13 | Box Jumps | 24"
16 | Cal Row |`,
                expected: {
                    title: 'E3MOM 17 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Power Clean',
                                unit: '135',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '13',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '16',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8163 - Image 5 - Rounds for Time',
                rawText: `6 Rounds | For Time
9 | Deadlifts | 225
16 | Double Unders |
8 | Handstand Push-ups |
20:15 |`,
                expected: {
                    title: '6 Rounds For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '9',
                                exercise: 'Deadlift',
                                unit: '225',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '16',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '8',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '20:15',
                            metadata: {
                                timeInSeconds: 1215,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8163 - Image 6 - AMRAP with Score',
                rawText: `AMRAP | | 14 min
12 | Cal Row |
14 | Thrusters | 75
16 | Pull-ups |
3 | + | 20 |`,
                expected: {
                    title: 'AMRAP 14 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '14',
                                exercise: 'Thruster',
                                unit: '75',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '16',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '3 + 20',
                            metadata: {
                                rounds: 3,
                                repsIntoNextRound: 20,
                                totalReps: 23,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8164 - Image 1 - Complex Workout',
                rawText: `3 Rounds | | 2:00 Rest
21 | Deadlifts | 185
15 | Box Jumps | 24"
9 | Handstand Push-ups |
rest | 2:00 |
8 | + | 15 |`,
                expected: {
                    title: '3 Rounds 2:00 Rest',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '21',
                                exercise: 'Deadlift',
                                unit: '185',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '9',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: 'rest 2:00',
                                type: 'rest',
                                duration: 120,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '8 + 15',
                            metadata: {
                                rounds: 8,
                                repsIntoNextRound: 15,
                                totalReps: 23,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8164 - Image 2 - For Time',
                rawText: `For Time
60 | Wall Balls | 20
50 | KB Swings | 53
40 | Box Jumps | 24"
14:45 |`,
                expected: {
                    title: 'For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '60',
                                exercise: 'Wall Ball',
                                unit: '20',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '50',
                                exercise: 'Kettlebell Swing',
                                unit: '53',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '40',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '14:45',
                            metadata: {
                                timeInSeconds: 885,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8164 - Image 3 - AMRAP',
                rawText: `AMRAP | | 20 min
24 | Thrusters | 95
19 | Pull-ups |
15 | Burpees |`,
                expected: {
                    title: 'AMRAP 20 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '24',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '19',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8164 - Image 4 - EMOM',
                rawText: `E2MOM | | 12 min
9 | Power Cleans | 135
14 | Box Jumps | 24"
17 | Cal Row |`,
                expected: {
                    title: 'E2MOM 12 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '9',
                                exercise: 'Power Clean',
                                unit: '135',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '14',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '17',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8164 - Image 5 - Rounds for Time',
                rawText: `7 Rounds | For Time
8 | Deadlifts | 225
14 | Double Unders |
7 | Handstand Push-ups |
22:30 |`,
                expected: {
                    title: '7 Rounds For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '8',
                                exercise: 'Deadlift',
                                unit: '225',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '14',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '7',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '22:30',
                            metadata: {
                                timeInSeconds: 1350,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8164 - Image 6 - AMRAP with Score',
                rawText: `AMRAP | | 16 min
13 | Cal Row |
15 | Thrusters | 75
18 | Pull-ups |
2 | + | 25 |`,
                expected: {
                    title: 'AMRAP 16 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '13',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Thruster',
                                unit: '75',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '18',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '2 + 25',
                            metadata: {
                                rounds: 2,
                                repsIntoNextRound: 25,
                                totalReps: 27,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8165 - Image 1 - Simple AMRAP',
                rawText: `AMRAP | | 10 min
15 | Burpees |
10 | Pull-ups |
5 | Handstand Push-ups |`,
                expected: {
                    title: 'AMRAP 10 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '5',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8165 - Image 2 - For Time',
                rawText: `For Time
65 | Wall Balls | 20
55 | KB Swings | 53
45 | Box Jumps | 24"
16:00 |`,
                expected: {
                    title: 'For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '65',
                                exercise: 'Wall Ball',
                                unit: '20',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '55',
                                exercise: 'Kettlebell Swing',
                                unit: '53',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '45',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '16:00',
                            metadata: {
                                timeInSeconds: 960,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8165 - Image 3 - EMOM',
                rawText: `E3MOM | | 15 min
11 | Power Cleans | 135
15 | Box Jumps | 24"
19 | Cal Row |`,
                expected: {
                    title: 'E3MOM 15 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '11',
                                exercise: 'Power Clean',
                                unit: '135',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '19',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8165 - Image 4 - Rounds for Time',
                rawText: `8 Rounds | For Time
7 | Deadlifts | 225
12 | Double Unders |
6 | Handstand Push-ups |
25:45 |`,
                expected: {
                    title: '8 Rounds For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '7',
                                exercise: 'Deadlift',
                                unit: '225',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '6',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '25:45',
                            metadata: {
                                timeInSeconds: 1545,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8165 - Image 5 - AMRAP',
                rawText: `AMRAP | | 22 min
26 | Thrusters | 95
21 | Pull-ups |
17 | Burpees |`,
                expected: {
                    title: 'AMRAP 22 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '26',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '21',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '17',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8165 - Image 6 - Chipper',
                rawText: `Chipper | For Time
110 | Double Unders |
90 | Sit-ups |
70 | Air Squats |
50 | Push-ups |
30 | Pull-ups |
18:15 |`,
                expected: {
                    title: 'Chipper For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '110',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '90',
                                exercise: 'Sit-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '70',
                                exercise: 'Air Squats',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '50',
                                exercise: 'Push-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '18:15',
                            metadata: {
                                timeInSeconds: 1095,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8166 - Image 1 - EMOM with Multiple Rounds',
                rawText: `E5MOM | | 20 min
10 | Cal Row |
8 | Thrusters | 95
6 | Pull-ups |
1:45 |
2:12 |
2:38 |
3:05 |`,
                expected: {
                    title: 'E5MOM 20 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '8',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '6',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Round 1',
                            type: 'time',
                            value: '1:45',
                            metadata: {
                                timeInSeconds: 105,
                            },
                        },
                        {
                            name: 'Round 2',
                            type: 'time',
                            value: '2:12',
                            metadata: {
                                timeInSeconds: 132,
                            },
                        },
                        {
                            name: 'Round 3',
                            type: 'time',
                            value: '2:38',
                            metadata: {
                                timeInSeconds: 158,
                            },
                        },
                        {
                            name: 'Round 4',
                            type: 'time',
                            value: '3:05',
                            metadata: {
                                timeInSeconds: 185,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8166 - Image 2 - For Time',
                rawText: `For Time
70 | Wall Balls | 20
60 | KB Swings | 53
50 | Box Jumps | 24"
17:30 |`,
                expected: {
                    title: 'For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '70',
                                exercise: 'Wall Ball',
                                unit: '20',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '60',
                                exercise: 'Kettlebell Swing',
                                unit: '53',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '50',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '17:30',
                            metadata: {
                                timeInSeconds: 1050,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8166 - Image 3 - AMRAP',
                rawText: `AMRAP | | 24 min
28 | Thrusters | 95
23 | Pull-ups |
19 | Burpees |`,
                expected: {
                    title: 'AMRAP 24 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '28',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '23',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '19',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8166 - Image 4 - EMOM',
                rawText: `E4MOM | | 16 min
12 | Power Cleans | 135
16 | Box Jumps | 24"
20 | Cal Row |`,
                expected: {
                    title: 'E4MOM 16 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Power Clean',
                                unit: '135',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '16',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8166 - Image 5 - Rounds for Time',
                rawText: `9 Rounds | For Time
6 | Deadlifts | 225
10 | Double Unders |
5 | Handstand Push-ups |
28:00 |`,
                expected: {
                    title: '9 Rounds For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '6',
                                exercise: 'Deadlift',
                                unit: '225',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '5',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '28:00',
                            metadata: {
                                timeInSeconds: 1680,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8166 - Image 6 - AMRAP with Score',
                rawText: `AMRAP | | 18 min
14 | Cal Row |
16 | Thrusters | 75
19 | Pull-ups |
1 | + | 30 |`,
                expected: {
                    title: 'AMRAP 18 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '14',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '16',
                                exercise: 'Thruster',
                                unit: '75',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '19',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '1 + 30',
                            metadata: {
                                rounds: 1,
                                repsIntoNextRound: 30,
                                totalReps: 31,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8167 - Image 1 - For Time with Weight',
                rawText: `For Time
30 | Clean & Jerk | 135
20 | Front Squats | 135
10 | Shoulder to Overhead | 135
9:47 |`,
                expected: {
                    title: 'For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '30',
                                exercise: 'Clean & Jerk',
                                unit: '135',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Front Squat',
                                unit: '135',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Shoulder To Overhead',
                                unit: '135',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '9:47',
                            metadata: {
                                timeInSeconds: 587,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8167 - Image 2 - AMRAP',
                rawText: `AMRAP | | 11 min
17 | Thrusters | 95
13 | Pull-ups |
11 | Burpees |`,
                expected: {
                    title: 'AMRAP 11 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '17',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '13',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '11',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8167 - Image 3 - EMOM',
                rawText: `E3MOM | | 15 min
13 | Power Cleans | 135
17 | Box Jumps | 24"
21 | Cal Row |`,
                expected: {
                    title: 'E3MOM 15 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '13',
                                exercise: 'Power Clean',
                                unit: '135',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '17',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '21',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8167 - Image 4 - Rounds for Time',
                rawText: `10 Rounds | For Time
5 | Deadlifts | 225
8 | Double Unders |
4 | Handstand Push-ups |
30:00 |`,
                expected: {
                    title: '10 Rounds For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '5',
                                exercise: 'Deadlift',
                                unit: '225',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '8',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '4',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '30:00',
                            metadata: {
                                timeInSeconds: 1800,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8167 - Image 5 - Chipper',
                rawText: `Chipper | For Time
120 | Double Unders |
100 | Sit-ups |
80 | Air Squats |
60 | Push-ups |
40 | Pull-ups |
20:00 |`,
                expected: {
                    title: 'Chipper For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '120',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '100',
                                exercise: 'Sit-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '80',
                                exercise: 'Air Squats',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '60',
                                exercise: 'Push-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '40',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '20:00',
                            metadata: {
                                timeInSeconds: 1200,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8167 - Image 6 - AMRAP with Score',
                rawText: `AMRAP | | 17 min
15 | Cal Row |
17 | Thrusters | 75
20 | Pull-ups |
8 | + | 5 |`,
                expected: {
                    title: 'AMRAP 17 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '17',
                                exercise: 'Thruster',
                                unit: '75',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '20',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '8 + 5',
                            metadata: {
                                rounds: 8,
                                repsIntoNextRound: 5,
                                totalReps: 13,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8168 - Image 1 - Complex EMOM',
                rawText: `E2MOM | | 16 min
5 | Power Snatch | 95
10 | Box Jumps | 24"
15 | Cal Row |
Rest | | 1:00
1:32 |
1:28 |
1:35 |
1:30 |`,
                expected: {
                    title: 'E2MOM 16 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '5',
                                exercise: 'Power Snatch',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '10',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '15',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'descriptive',
                            descriptive: {
                                text: 'Rest 1:00',
                                type: 'rest',
                                duration: 60,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Round 1',
                            type: 'time',
                            value: '1:32',
                            metadata: {
                                timeInSeconds: 92,
                            },
                        },
                        {
                            name: 'Round 2',
                            type: 'time',
                            value: '1:28',
                            metadata: {
                                timeInSeconds: 88,
                            },
                        },
                        {
                            name: 'Round 3',
                            type: 'time',
                            value: '1:35',
                            metadata: {
                                timeInSeconds: 95,
                            },
                        },
                        {
                            name: 'Round 4',
                            type: 'time',
                            value: '1:30',
                            metadata: {
                                timeInSeconds: 90,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8168 - Image 2 - For Time',
                rawText: `For Time
75 | Wall Balls | 20
65 | KB Swings | 53
55 | Box Jumps | 24"
19:15 |`,
                expected: {
                    title: 'For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '75',
                                exercise: 'Wall Ball',
                                unit: '20',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '65',
                                exercise: 'Kettlebell Swing',
                                unit: '53',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '55',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '19:15',
                            metadata: {
                                timeInSeconds: 1155,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8168 - Image 3 - AMRAP',
                rawText: `AMRAP | | 13 min
18 | Thrusters | 95
14 | Pull-ups |
12 | Burpees |`,
                expected: {
                    title: 'AMRAP 13 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '18',
                                exercise: 'Thruster',
                                unit: '95',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '14',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '12',
                                exercise: 'Burpee',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8168 - Image 4 - EMOM',
                rawText: `E3MOM | | 14 min
14 | Power Cleans | 135
18 | Box Jumps | 24"
22 | Cal Row |`,
                expected: {
                    title: 'E3MOM 14 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '14',
                                exercise: 'Power Clean',
                                unit: '135',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '18',
                                exercise: 'Box Jump',
                                unit: '24"',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '22',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                    ],
                    score: [],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8168 - Image 5 - Rounds for Time',
                rawText: `11 Rounds | For Time
4 | Deadlifts | 225
6 | Double Unders |
3 | Handstand Push-ups |
32:30 |`,
                expected: {
                    title: '11 Rounds For Time',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '4',
                                exercise: 'Deadlift',
                                unit: '225',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '6',
                                exercise: 'Double Unders',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '3',
                                exercise: 'Handstand Push-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Finish Time',
                            type: 'time',
                            value: '32:30',
                            metadata: {
                                timeInSeconds: 1950,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
            {
                name: 'IMG_8168 - Image 6 - AMRAP with Score',
                rawText: `AMRAP | | 19 min
16 | Cal Row |
18 | Thrusters | 75
21 | Pull-ups |
9 | + | 10 |`,
                expected: {
                    title: 'AMRAP 19 min',
                    description: expect.any(String),
                    workout: [
                        {
                            type: 'movement',
                            movement: {
                                amount: '16',
                                exercise: 'Cal Row',
                                unit: null,
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '18',
                                exercise: 'Thruster',
                                unit: '75',
                            },
                        },
                        {
                            type: 'movement',
                            movement: {
                                amount: '21',
                                exercise: 'Pull-up',
                                unit: null,
                            },
                        },
                    ],
                    score: [
                        {
                            name: 'Total',
                            type: 'reps',
                            value: '9 + 10',
                            metadata: {
                                rounds: 9,
                                repsIntoNextRound: 10,
                                totalReps: 19,
                            },
                        },
                    ],
                    confidence: expect.any(Number),
                    privacy: 'public',
                },
            },
        ];

        examplePhotoTestCases.forEach(({ name, rawText, expected }) => {
            it(`should parse ${name} correctly`, () => {
                const result = parseWorkoutFromRawText(rawText);
                expect(result).toMatchObject(expected);
            });
        });
    });
});

