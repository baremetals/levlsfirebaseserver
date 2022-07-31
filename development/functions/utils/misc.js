// db.collection('users')
//   .get()
//   .then(async (data) => {
//     // console.log(data.docs[0].fieldsProto);
//     // console.log(data.docs[0].data());
//     data.docs.forEach(async (doc) => {
//       await db
//         .doc(`users/${doc.data().userId}/followings/${config.levlsUserId}`)
//         .get()
//         .then(async (dc) => {
//           if (!dc.exists) {
//             console.log('dogs bullocks');
//             await db
//               .doc(
//                 `users/${doc.data().userId}/followings/${config.levlsUserId}`
//               )
//               .set({
//                 createdAt: new Date().toISOString(),
//                 followedUserId: config.levlsUserId,
//                 followedUserImageUrl: config.levlsLogoUrl,
//                 followedUserUsername: 'levls',
//                 followedUserBkImage: config.levlsBkImage,
//                 followedUserCity: 'London',
//                 followedUserCountry: 'UK',
//                 followedUserOccupationOrIndustry: 'Technology',
//               });
//             return console.log({ success: 'done geeza' });
//           }
//         });
//     });
//   })
//   .catch((err) => {
//     console.error(err);
//   });
