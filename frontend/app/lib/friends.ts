
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
	requesterId: string;
	// We usually expand the 'friend' details so we can show their name
	friend: FriendUser;
}

//API functions

//This functions is to get my list if accepted friends
export async function getFriends(): Promise<Friendship[]> {
	const res = await fetch('/api/friendship/list', {
		credentials: 'include',
		cache: 'no-store',
	});
	if (!res.ok) return[];
	return res.json();
}

// Function to get pending requests (people who added me)
export async function getFriendRequests(): Promise<Friendship[]> {
  const res = await fetch('/api/friendship/requests', {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

// Function to send a request to someone by userId
export async function sendFriendRequest(userId: string) {
  const res = await fetch(`/api/friendship/request/${userId}`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to send request');
  return res.json();
}

// Function to Accept a request
export async function acceptRequest(friendshipId: string) {
  const res = await fetch(`/api/friendship/accept/${friendshipId}`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to accept');
  return res.json();
}

// Function to Reject a request
export async function rejectRequest(friendshipId: string) {
  const res = await fetch(`/api/friendship/reject/${friendshipId}`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to reject');
  return res.json();
}

// Helper to respond (compatible with some UIs)
export async function respondToRequest(requestId: string, status: FriendStatus.ACCEPTED | FriendStatus.REJECTED) {
  if (status === FriendStatus.ACCEPTED) return acceptRequest(requestId);
  return rejectRequest(requestId);
}

