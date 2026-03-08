class SignupDetails {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  timezone: string;

  constructor(
    email: string,
    firstName: string,
    lastName: string,
    companyName: string,
    timezone: string,
  ) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.companyName = companyName;
    this.timezone = timezone;
  }
}

export default SignupDetails;
