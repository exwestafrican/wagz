class SignupDetails {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;

  constructor(email: string, firstName: string, lastName: string, companyName: string) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.companyName = companyName;
  }
}

export default SignupDetails;
