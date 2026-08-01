import DebounceService from '@/common/debounce.service';

describe('DebounceService', () => {
  let service: DebounceService;
  let nowSpy: jest.SpiedFunction<typeof Date.now>;

  const setNowSeconds = (sec: number) => {
    nowSpy.mockReturnValue(sec * 1000);
  };

  beforeEach(() => {
    service = new DebounceService();
    nowSpy = jest.spyOn(Date, 'now');
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('runs action on first call and ignores repeated call within window', async () => {
    setNowSeconds(1000);
    const action: () => string = jest.fn().mockResolvedValue('ok');

    const first = await service.runOrIgnore('id-1', 60, action);
    const second = await service.runOrIgnore('id-1', 60, action);

    expect(first).toBe('ok');
    expect(second).toBe(undefined);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('runs action again after cool down period has passed', async () => {
    const action = jest.fn().mockResolvedValue('ok');

    setNowSeconds(1000);
    await service.runOrIgnore('id-1', 60, action);

    setNowSeconds(1001);
    await service.runOrIgnore('id-1', 60, action);

    setNowSeconds(1061);
    await service.runOrIgnore('id-1', 60, action);

    expect(action).toHaveBeenCalledTimes(2);
  });

  it('does not debounce across different ids', async () => {
    setNowSeconds(1000);
    const actionA: () => string = jest.fn().mockResolvedValue('a');
    const actionB: () => string = jest.fn().mockResolvedValue('b');

    const resultA = await service.runOrIgnore('id-a', 60, actionA);
    const resultB = await service.runOrIgnore('id-b', 60, actionB);

    expect(resultA).toBe('a');
    expect(resultB).toBe('b');
    expect(actionA).toHaveBeenCalledTimes(1);
    expect(actionB).toHaveBeenCalledTimes(1);
  });

  it('rolls back debounce entry when action throws', async () => {
    setNowSeconds(1000);
    const action: jest.Mock = jest.fn();

    action.mockRejectedValue(new Error('boom'));

    await expect(service.runOrIgnore('id-1', 60, action)).rejects.toThrow(
      'boom',
    );

    action.mockResolvedValue('ok');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await service.runOrIgnore('id-1', 60, action);

    expect(result).toBe('ok');
    expect(action).toHaveBeenCalledTimes(2);
  });
});
