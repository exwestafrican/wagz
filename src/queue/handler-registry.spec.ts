import { createHandlerRegistry } from '@/queue/handler-registry';

describe('createHandlerRegistry', () => {
  it('returns a registered handler by queue name', () => {
    const handlerRegistry = createHandlerRegistry();
    const emailNotificationHandler = {
      name: 'email-notification',
      handle: () => Promise.resolve(),
    };
    handlerRegistry.register(emailNotificationHandler);

    expect(handlerRegistry.get('email-notification')).toBe(
      emailNotificationHandler,
    );
  });

  it('rejects a duplicate queue name', () => {
    const handlerRegistry = createHandlerRegistry();
    handlerRegistry.register({
      name: 'email-notification',
      handle: () => Promise.resolve(),
    });

    expect(() =>
      handlerRegistry.register({
        name: 'email-notification',
        handle: () => Promise.resolve(),
      }),
    ).toThrow('Job handler already registered: email-notification');
  });
});
