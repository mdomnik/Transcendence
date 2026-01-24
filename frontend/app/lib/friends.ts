
//defining the posible status matches with backend 
export enum FriendStatus {
	PENDING = 'PENDING',
	ACCEPTED = 'ACCEPTED',
	REJECTED = 'REJECTED',
	BLOCKED = 'BLOCKED',
}

//Defining the shape of a user 
export interface FriendUser {
	id: string;
	username: string;
	avatarPath?: string;
	status?: 'online' | 'offline' | 'in-game'; // maybe we need more options later
}

//Defining the structure of a friendship from the API
export interface Friendship {
	id: string;
	status: FriendStatus;
	requesterId?: string;
	blockerId?: string;
	// We usually expand the 'friend' details so we can show their name
	friend: FriendUser;
	isRequester?: boolean;
	isBlocker?: boolean;
}

// WebSocket functions
import { getSocket } from './socket';
import { emitWithAck } from './socketEmit';

// Function to get my list of accepted friends via socket
export async function getFriends(): Promise<Friendship[]> {
	try {
		const socket = getSocket();
		if (!socket.connected) {
			socket.connect();
			// Wait for connection
			await new Promise<void>(resolve => socket.once('connect', () => resolve()));
		}
		const result = await emitWithAck(socket, 'friendship:list');
		return result.ok ? result.data : [];
	} catch (error) {
		console.error('Failed to get friends:', error);
		return [];
	}
}

// Function to get pending requests (people who added me) via socket
export async function getFriendRequests(): Promise<Friendship[]> {
  try {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      await new Promise(resolve => socket.once('connect', () => resolve(undefined)));
    }
    // Note: Gateway doesn't have a separate requests endpoint, 
    // we'll get all friendships and filter on client
    const result = await emitWithAck(socket, 'friendship:list');
    if (!result.ok) return [];
    
    // Filter to show only incoming requests (where we are not the requester)
    return (result.data || []).filter((f: Friendship) => f.status === FriendStatus.PENDING && !f.isRequester);
  } catch (error) {
    console.error('Failed to get friend requests:', error);
    return [];
  }
}

// Function to get blocked users via socket
export async function getBlockedUsers(): Promise<Friendship[]> {
  try {
    const socket = getSocket();
    if (!socket.connected) {
      console.log('[getBlockedUsers] Socket not connected, connecting...');
      socket.connect();
      await new Promise(resolve => socket.once('connect', () => resolve(undefined)));
    }
    console.log('[getBlockedUsers] Emitting friendship:blocked');
    const result = await emitWithAck(socket, 'friendship:blocked');
    console.log('[getBlockedUsers] Result:', result);
    return result.ok ? result.data : [];
  } catch (error) {
    console.error('Failed to get blocked users:', error);
    return [];
  }
}

// Function to send a request to someone by userId via socket
export async function sendFriendRequest(userId: string) {
  try {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      await new Promise(resolve => socket.once('connect', () => resolve(undefined)));
    }
    const result = await emitWithAck(socket, 'friendship:request', { userId });
    if (!result.ok) {
      // Return error details instead of throwing
      return { ok: false, error: result.error?.message || 'Failed to send request' };
    }
    return { ok: true, data: result.data };
  } catch (error) {
    console.error('Failed to send friend request:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to send request' };
  }
}

// Function to Accept a request via socket
export async function acceptRequest(friendshipId: string) {
  try {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      await new Promise(resolve => socket.once('connect', () => resolve(undefined)));
    }
    const result = await emitWithAck(socket, 'friendship:accept', { friendshipId });
    if (!result.ok) throw new Error(result.error?.message || 'Failed to accept');
    return result.data;
  } catch (error) {
    console.error('Failed to accept request:', error);
    throw error;
  }
}

// Function to Reject a request via socket
export async function rejectRequest(friendshipId: string) {
  try {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      await new Promise(resolve => socket.once('connect', () => resolve(undefined)));
    }
    const result = await emitWithAck(socket, 'friendship:reject', { friendshipId });
    if (!result.ok) throw new Error(result.error?.message || 'Failed to reject');
    return result.data;
  } catch (error) {
    console.error('Failed to reject request:', error);
    throw error;
  }
}

// Function to cancel a request via socket
export async function cancelRequest(userId: string) {
  try {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      await new Promise<void>(resolve => socket.once('connect', () => resolve()));
    }
    console.log('[cancelRequest] Emitting friendship:cancel for user:', userId);
    const result = await emitWithAck(socket, 'friendship:cancel', { userId });
    console.log('[cancelRequest] Result:', result);
    if (!result.ok) throw new Error(result.error?.message || 'Failed to cancel');
    return result.data;
  } catch (error) {
    console.error('Failed to cancel request:', error);
    throw error;
  }
}

// Function to block a user via socket
export async function blockUser(userId: string) {
  try {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      await new Promise<void>(resolve => socket.once('connect', () => resolve()));
    }
    console.log('[blockUser] Emitting friendship:block for user:', userId);
    const result = await emitWithAck(socket, 'friendship:block', { userId });
    console.log('[blockUser] Result:', result);
    if (!result.ok) throw new Error(result.error?.message || 'Failed to block');
    return result.data;
  } catch (error) {
    console.error('Failed to block user:', error);
    throw error;
  }
}

// Function to unblock a user via socket
export async function unblockUser(userId: string) {
  try {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      await new Promise<void>(resolve => socket.once('connect', () => resolve()));
    }
    console.log('[unblockUser] Emitting friendship:unblock for user:', userId);
    const result = await emitWithAck(socket, 'friendship:unblock', { userId });
    console.log('[unblockUser] Result:', result);
    if (!result.ok) throw new Error(result.error?.message || 'Failed to unblock');
    return result.data;
  } catch (error) {
    console.error('Failed to unblock user:', error);
    throw error;
  }
}
// Function to remove a friend via socket (uses cancel endpoint)
export async function removeFriend(userId: string) {
  try {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      await new Promise<void>(resolve => socket.once('connect', () => resolve()));
    }
    console.log('[removeFriend] Emitting friendship:cancel for user:', userId);
    const result = await emitWithAck(socket, 'friendship:cancel', { userId });
    console.log('[removeFriend] Result:', result);
    if (!result.ok) throw new Error(result.error?.message || 'Failed to remove friend');
    return result.data;
  } catch (error) {
    console.error('Failed to remove friend:', error);
    throw error;
  }
}
// Helper to respond (compatible with some UIs)
export async function respondToRequest(requestId: string, status: FriendStatus.ACCEPTED | FriendStatus.REJECTED) {
  if (status === FriendStatus.ACCEPTED) return acceptRequest(requestId);
  return rejectRequest(requestId);
}

