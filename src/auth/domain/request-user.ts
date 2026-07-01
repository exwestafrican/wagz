export type ImpersonationContext = {
  sessionId: string;
  teammateId: number;
  workspaceCode: string;
};

export default class RequestUser {
  readonly email: string;
  readonly impersonation?: ImpersonationContext;

  constructor(email: string, impersonation?: ImpersonationContext) {
    this.email = email;
    this.impersonation = impersonation;
  }

  get isImpersonating(): boolean {
    return this.impersonation != null;
  }

  static of(email: string) {
    return new RequestUser(email);
  }

  withImpersonation(impersonation: ImpersonationContext): RequestUser {
    return new RequestUser(this.email, impersonation);
  }
}
