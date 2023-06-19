const firebaseAdmin = {
  // 模擬 Firebase 初始化方法
  initializeApp: jest.fn(),

  storage: jest.fn().mockReturnValue({
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue({
        createWriteStream: jest.fn().mockReturnValue({
          on: jest.fn().mockImplementation((event, callback) => {
            if (event === "finish") {
              callback();
            }
          }),
          end: jest.fn(),
        }),
        getSignedUrl: jest.fn().mockImplementation((config, callback) => {
          const fireUrl =
            "https://storage.googleapis.com/love-in-no-words-back-end.appspot.com/images/3e06bab2-39a9-48de-8a32-ed74552396d8.jpg?GoogleAccessId=firebase-adminsdk-vpr58%40love-in-no-words-back-end.iam.gserviceaccount.com&Expires=16756642800&Signature=E7oxfE7qVy92dYToeqM1C1vIWQj3FFlWvuGd27cETFYrR43TUDLnEaI7%2BDMmT2UJolvwvmlUgi%2BagMlueadyujYHocOvHOkVhBIHwD9e5ERcSOrEjjlyHc2Byj7E2h3m5Is7saXnGgY5VJsdUJRPv%2BDjJ7EHuTkzvgnMZ3Fa%2Fi8kWvTC%2F8EfEKBSMgy7E%2B0dFM0W1xlxILAJ7bjBwfh%2F9qnUJgJVDl%2B1Cu7Xg1%2FE5tpdulIgWwfYzjxLvo%2BNPW2qa%2FQQFfrva0Lt92vfNUhGRNX5H9pyF60%2FY9BT283J%2BByE1UaUpksUw%2BSWmWp64vYIA%2FSUuijm6b16wo6dwCr7fg%3D%3D";

          callback(null, fireUrl);
        }),
      }),
    }),
  }),
};
export default firebaseAdmin;
