import { createMockSupabaseClient, MockSupabaseClient } from "@/auth/test-utils/supabase.mock";
import { PrismaService } from "@/prisma/prisma.service";
import { createTestApp, TestControllerModuleWithAuthUser } from "@/test-helpers/test-app";
import { INestApplication } from "@nestjs/common";
import { ConversationsController } from "./conversations.controller";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import RequestUser from "@/auth/domain/request-user";
import { ConversationsService } from "./conversations.service";
import { Server } from "http";
import request from 'supertest';
import { ConversationEndpoints } from "@/common/const";
import ValidationErrorResponseDto from "@/common/dto/validation-error.dto";

describe('AuthController', () => { 
    let app: INestApplication;
    let mockSupabaseClient: MockSupabaseClient;
    let prismaService: PrismaService;
     let requestUser: RequestUser;

    beforeEach(async () => {
        mockSupabaseClient = createMockSupabaseClient();
        requestUser = RequestUser.of('laura@useEnvoye.com');
        const module = await TestControllerModuleWithAuthUser({
            controllers: [ConversationsController],
            providers: [ConversationsService],
        }).with(requestUser);
        app = await createTestApp(module);
        prismaService = app.get<PrismaService>(PrismaService);
        
    });

    function getHttpServer(app: INestApplication): Server {
        return app.getHttpServer() as unknown as Server;
    }

    it('should return 200 if the recepient is valid', async () => {
        //need to create a workspace and recepient teammate before making the request
        const response = await request(getHttpServer(app))
        .post(ConversationEndpoints.CREATE_CONVERSATION)
        .send({
            "workspaceCode": "12er56",
            "customerInfo": "john@acme.com",
            "subject": "Billing issue",
            "recipientTeammateId": 5
        })
        .set('Accept', 'application/json')
        .expect(400);

        const body = response.body as ValidationErrorResponseDto;
        expect(body.property).toMatchObject(['email']);
    });

});