import { CouchDb } from '@teammaestro/node-couchdb-client';

import { message } from '../interfaces/message.interface';
import { room } from '../interfaces/room.interface';
import { user } from '../interfaces/user.interface';

// Instatiate new CouchDB request class
const db = new CouchDb({
  host: "http://m320trololol.com",
  port: 5984,
  auth: {
    username: "admin",
    password: "node-chat-backend"
  }
});

export async function getChatRooms() {
  var rooms = await db.getDocuments({
    dbName: "rooms",
    options: { include_docs: true }
  });
  let result: room[] = [];
  rooms.rows.forEach(element => {
    if (element.doc) {
      result.push(element.doc.room);
    }
  });
  return { action: "getChatRooms", rooms: result };
}

export async function getMessagesInRoom(roomName: string) {
  if (!roomName) {
    return new Error("roomName must be defined");
  }
  var messages = await db.findDocuments({
    dbName: "messages",
    findOptions: { selector: { roomName: roomName } }
  });
  let result: message[] = [];
  messages.docs.forEach(message => {
    if (message) {
      result.push(message.message);
    }
  });
}

export async function createChatRoom(roomName: string, creator: user) {
  const room: room = {
    roomName: roomName,
    created: new Date(Date.now()),
    owners: [creator],
    users: [creator]
  };
  const existingRooms = await db.findDocuments({
    dbName: "rooms",
    findOptions: { selector: { roomName: roomName } }
  });

  if (existingRooms.docs.length > 0) {
    return Promise.reject(new Error(`Room ${roomName} already exists`));
  }
  return db.createDocument({ doc: room, dbName: "rooms" });
}

export async function joinChatRoom(roomName: string, joining: user) {
  const existingRooms = await db.findDocuments({
    dbName: "rooms",
    findOptions: { selector: { roomName: roomName } }
  });

  if (existingRooms.docs.length > 0) {
    if (existingRooms.docs.length < 2) {
      let joinedUsers: string[] = [];
      existingRooms.docs[0].users.forEach((user: user) => {
        joinedUsers.push(user.userName);
      });
      if (joinedUsers.indexOf(joining.userName) > -1) {
        return Promise.reject(
          new Error(`User ${joining.userName} already in Room ${roomName}`)
        );
      } else {
        let newUsers: user[] = existingRooms.docs[0].users;
        newUsers.push(joining);
        return db.updateDocument({
          dbName: "rooms",
          docId: existingRooms.docs[0]._id,
          rev: existingRooms.docs[0]._rev || "",
          updatedDoc: {
            _id: existingRooms.docs[0]._id,
            _rev: existingRooms.docs[0]._rev,
            roomName: existingRooms.docs[0].roomName,
            created: existingRooms.docs[0].created,
            owners: existingRooms.docs[0].owners,
            users: newUsers
          }
        });
      }
    } else {
      return Promise.reject(new Error(`Room ${roomName} has duplictes!`));
      //TODO: delete duplicates
    }
  } else {
    return Promise.reject(
      new Error(`Room ${roomName} doesn't exist, create it first`)
    );
  }
}

export async function postMessage(message: message) {
  const existingRooms = await db.findDocuments({
    dbName: "rooms",
    findOptions: { selector: { roomName: message.roomName } }
  });
  let rooms: string[] = [];
  existingRooms.docs.forEach(document => rooms.push(document.roomName));

  if (rooms.indexOf(message.roomName) > -1) {
    return db.createDocument({doc: message, dbName: "messages"});
  } else {
    return Promise.reject(
      new Error(`Room ${message.roomName} doesn't exist, create and join it first`)
    );
  }
}

// export function getUsersInRoom(roomId) {
//   if(!roomId) {
//     return Promise.reject(new Error('Room must be defined'));
//   }

//   return db.loadUsers(roomId);
// }

// export function postPrivateMessage(userId, {user, message, meta}) {
//   if(!userId || !user || !message) {
//     return Promise.reject(new Error('Recipient, User, Message must be defined'));
//   }

//   // create private conversation as new chat-room
//   const roomId = getPrivateChatRoomName(userId, user);
//   return db.storeMessage(roomId, true, {user, message, meta, timestamp: Date.now()});
// }

// export function getPrivateChatRoomName(userA, userB) {
//   return userA < userB ? `${userA}_x_${userB}`: `${userB}_x_${userA}`;
// }

module.exports = {
  getChatRooms,
  createChatRoom,
  joinChatRoom,
  // getMessagesInRoom,
  postMessage,
  // getUsersInRoom,
  // postPrivateMessage,
  // getPrivateChatRoomName
};
