import { MessageBody, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";

@WebSocketGateway({
  cors: {
    origin: ['http://localhost', 'https://localhost'],
    credentials: true,
  },
})
export class LobbyGateway {
    @SubscribeMessage('newMessage')
    handleNewMessage(@MessageBody() message: any) {
        console.log(message);
    }
}
