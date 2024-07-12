import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { nanoid } from "nanoid";
import React from "react";

import { createLiveblocksContext } from "../liveblocks";
import { createRoomContext } from "../room";
import { dummyThreadData, dummyThreadInboxNotificationData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import {
  mockDeleteInboxNotification,
  mockGetInboxNotifications,
} from "./_restMocks";
import { generateFakeJwt } from "./_utils";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => server.close());

// TODO: Dry up and create utils that wrap renderHook
function createRoomContextForTest<M extends BaseMetadata>() {
  const client = createClient({
    async authEndpoint() {
      return {
        token: await generateFakeJwt({ userId: "userId" }),
      };
    },
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
  });

  return {
    roomCtx: createRoomContext<JsonObject, never, never, never, M>(client),
    liveblocksCtx: createLiveblocksContext(client),
  };
}

describe("useDeleteInboxNotifications", () => {
  test("should delete a notification optimistically", async () => {
    const roomId = nanoid();
    const thread1 = dummyThreadData({ roomId });
    const thread2 = dummyThreadData({ roomId });
    const threads = [thread1, thread2];
    const notification1 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread1.id,
      readAt: null,
    });
    const notification2 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread2.id,
      readAt: null,
    });
    const inboxNotifications = [notification1, notification2];

    server.use(
      mockGetInboxNotifications((_req, res, ctx) =>
        res(
          ctx.status(200),
          ctx.json({
            inboxNotifications,
            threads,
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        )
      ),
      mockDeleteInboxNotification(
        { inboxNotificationId: notification1.id },
        (_req, res, ctx) => res(ctx.status(204))
      )
    );

    const {
      liveblocksCtx: {
        LiveblocksProvider,
        useInboxNotifications,
        useDeleteInboxNotification,
      },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        deleteInboxNotification: useDeleteInboxNotification(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
        deletedThreads: [],
        deletedInboxNotifications: [],
        meta: {
          requestedAt: new Date().toISOString(),
        },
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(inboxNotifications)
    );

    act(() => {
      result.current.deleteInboxNotification(notification1.id);
    });

    expect(result.current.inboxNotifications).toEqual([notification2]);

    unmount();
  });

  test("should delete a notification optimistically and revert the update if error response from server", async () => {
    const roomId = nanoid();
    const thread1 = dummyThreadData({ roomId });
    const thread2 = dummyThreadData({ roomId });
    const threads = [thread1, thread2];
    const notification1 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread1.id,
      readAt: null,
    });
    const notification2 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread2.id,
      readAt: null,
    });
    const inboxNotifications = [notification1, notification2];

    server.use(
      mockGetInboxNotifications((_req, res, ctx) =>
        res(
          ctx.status(200),
          ctx.json({
            inboxNotifications,
            threads,
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        )
      ),
      mockDeleteInboxNotification(
        { inboxNotificationId: notification1.id },
        (_req, res, ctx) => res(ctx.status(500))
      )
    );

    const {
      liveblocksCtx: {
        LiveblocksProvider,
        useInboxNotifications,
        useDeleteInboxNotification,
      },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        deleteInboxNotification: useDeleteInboxNotification(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
        deletedThreads: [],
        deletedInboxNotifications: [],
        meta: {
          requestedAt: new Date().toISOString(),
        },
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(inboxNotifications)
    );

    // We delete the notification optimitiscally
    act(() => {
      result.current.deleteInboxNotification(notification1.id);
    });

    expect(result.current.inboxNotifications).toEqual([notification2]);

    await waitFor(() => {
      // The optimistic update is reverted because of the error response
      expect(result.current.inboxNotifications).toEqual(inboxNotifications);
    });

    unmount();
  });

  test("should support deleting a notification and its related thread", async () => {
    const roomId = nanoid();
    const thread1 = dummyThreadData({ roomId });
    const thread2 = dummyThreadData({ roomId });
    const threads = [thread1, thread2];
    const notification1 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread1.id,
      readAt: null,
    });
    const notification2 = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread2.id,
      readAt: null,
    });
    const inboxNotifications = [notification1, notification2];

    server.use(
      mockGetInboxNotifications((_req, res, ctx) =>
        res(
          ctx.status(200),
          ctx.json({
            inboxNotifications,
            threads,
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        )
      ),
      mockDeleteInboxNotification(
        { inboxNotificationId: notification1.id },
        (_req, res, ctx) => res(ctx.status(500))
      )
    );

    const {
      roomCtx: { RoomProvider, useDeleteThread },
      liveblocksCtx: {
        LiveblocksProvider,
        useInboxNotifications,
        useDeleteInboxNotification,
      },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        deleteInboxNotification: useDeleteInboxNotification(),
        deleteThread: useDeleteThread(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
        deletedThreads: [],
        deletedInboxNotifications: [],
        meta: {
          requestedAt: new Date().toISOString(),
        },
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <RoomProvider id={roomId}>{children}</RoomProvider>
          </LiveblocksProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(inboxNotifications)
    );

    // We delete the notification optimitiscally
    act(() => {
      result.current.deleteInboxNotification(notification1.id);
    });

    expect(result.current.inboxNotifications).toEqual([notification2]);

    // We also delete its related thread optimitiscally
    act(() => {
      result.current.deleteThread(thread1.id);
    });

    expect(result.current.inboxNotifications).toEqual([notification2]);

    unmount();
  });
});
