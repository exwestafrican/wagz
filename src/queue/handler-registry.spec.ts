import { createHandlerRegistry } from '@/queue/handler-registry';

describe('createHandlerRegistry', () => {
  it('returns a registered handler by job name', () => {
    const handlerRegistry = createHandlerRegistry();
    const sendInviteHandler = {
      name: 'envoye.send-invite',
      handle: () => Promise.resolve(),
    };
    handlerRegistry.register(sendInviteHandler);

    expect(handlerRegistry.get('envoye.send-invite')).toBe(sendInviteHandler);
  });

  it('rejects a duplicate job name', () => {
    const handlerRegistry = createHandlerRegistry();
    handlerRegistry.register({
      name: 'envoye.send-invite',
      handle: () => Promise.resolve(),
    });

    expect(() =>
      handlerRegistry.register({
        name: 'envoye.send-invite',
        handle: () => Promise.resolve(),
      }),
    ).toThrow('Job handler already registered: envoye.send-invite');
  });
});
