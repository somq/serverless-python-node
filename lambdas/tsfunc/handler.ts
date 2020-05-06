// import 'source-map-support/register';

export class Testx {
  testy: string;

  testx = 'adad';

  constructor() {
    console.log('testx: ', this.testx);
  }
}
export const hello = async (event) => {
  const r = new Testx();
  console.log('Class instance (test): ', r);
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'It works!',
      input: event,
    }, null, 2),
  };
};

export default hello

// hello('a')