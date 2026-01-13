
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
	avatar?: string;
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
	const res = await fetch('/api/friends', {
		credentials: 'include',
		cache: 'no-store',
	});
	if (!res.ok) return[];
	return res.json();
}

// Function to get pending requests (people who added me)
export async function getFriendRequests(): Promise<Friendship[]> {
  const res = await fetch('/api/friends/requests', {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

// Function to send a request to someone by username
export async function sendFriendRequest(username: string) {
  const res = await fetch('/api/friends/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to send request');
  return res.json();
}

// Function to Accept or Reject a request
export async function respondToRequest(requestId: string, status: FriendStatus.ACCEPTED | FriendStatus.REJECTED) {
  const res = await fetch(`/api/friends/${requestId}/respond`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to respond');
  return res.json();
}

