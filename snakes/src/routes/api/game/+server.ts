// import { Server } from 'socket.io';
// import { gameState, updateGameState, addPlayer, removePlayer } from '$lib/game';

// export const GET: RequestHandler = ({ request }) => {
//   const io = new Server();
//   io.attach(request.socket.server);

//   io.on('connection', (socket) => {
//     console.log('a user connected:', socket.id);
//     addPlayer(socket.id);

//     socket.on('disconnect', () => {
//       console.log('user disconnected:', socket.id);
//       removePlayer(socket.id);
//     });

//     socket.on('move', (direction: string) => {
//       const player = gameState.players[socket.id];
//       if (player) {
//         player.direction = direction;
//       }
//     });
//   });

//   setInterval(() => {
//     updateGameState();
//     io.emit('gameState', gameState);
//   }, 100);

//   return new Response(null, { status: 200 });
// };

import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const TEMPORAL_ADDRESS = env.TEMPORAL_ADDRESS;
const TEMPORAL_NAMESPACE = env.TEMPORAL_NAMESPACE;
const TEMPORAL_TASK_QUEUE = env.TEMPORAL_TASK_QUEUE;
const TEMPORAL_WORKFLOW_TYPE = env.TEMPORAL_WORKFLOW_TYPE;
const workflowsUrl = `${TEMPORAL_ADDRESS}/api/v1/namespaces/${TEMPORAL_NAMESPACE}/workflows`;

type GameAction = {
	action: 'startGame' | 'startRound' | 'move' | 'query';
	workflowId: string;
	input: GameInput;
	numSpaces: number;
};

export async function POST({ request }) {
	try {
		const body = await request.json();
		console.log('REQUEST: ', body);
		const { action, workflowId, duration, input, numSpaces } = body;

		switch (action) {
			case 'startGame':
				return await startGame(input);
			case 'startRound':
				return await startRound(duration, workflowId);
			case 'move':
				return await movePlayer(workflowId, playerName, numSpaces);
			case 'query':
				return await queryGameState(workflowId);
			default:
				return json({ error: 'Invalid action' }, { status: 400 });
		}
	} catch (error: any) {
		console.error('Error processing request:', error);
		return json({ error: error.message }, { status: 500 });
	}
}

type Team = {
	name: string;
};

type GameInput = {
	width: number;
	height: number;
	snakesPerTeam: number;
	teams: Team[];
};

async function startGame(input: GameInput) {
	console.log('Starting game with input:', input);
	const workflowId = `game-${Date.now()}`;
	const response = await fetch(`${workflowsUrl}/${workflowId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			workflowType: { name: TEMPORAL_WORKFLOW_TYPE },
			taskQueue: { name: TEMPORAL_TASK_QUEUE },
			input: [input]
		})
	});

	console.log('Start Game Response: ', response);
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const result = await response.json();
	return json({ workflowId, runId: result.runId });
}

async function startRound(duration: number, workflowId: string) {
	console.log('Starting round with duration:', duration);
	const updateName = 'roundStart';
	const response = await fetch(`${workflowsUrl}/${workflowId}/update/${updateName}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			namespace: TEMPORAL_NAMESPACE,
			workflowExecution: { workflowId },
			waitPolicy: { lifecycleStage: 'UPDATE_WORKFLOW_EXECUTION_LIFECYCLE_STAGE_COMPLETED' },
			request: {
				meta: { updateId: 'begin-round' },
				input: {
					name: updateName,
					args: {
						payloads: [30]
					}
				}
			}
		})
	});

	if (!response.ok) {
		const error = await response.text();
		console.log('Error: ', error);
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const result = await response.json();
	return json({ result });
}

async function movePlayer(workflowId: string, playerName, numSpaces) {
	const response = await fetch(`${workflowsUrl}/${workflowId}/signal`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			signal_name: 'movePlayer',
			input: [playerName, numSpaces]
		})
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	return json({ success: true });
}

async function queryGameState(workflowId: string) {
	const response = await fetch(`${workflowsUrl}/${workflowId}/query`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			queryName: 'getGameState'
		})
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const result = await response.json();
	return json(result.queryResult);
}
