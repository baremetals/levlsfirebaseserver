exports.submitGrantApplication = (req, res) => {

    const BusBoy = require("busboy");
    const path = require("path");
    const os = require("os");
    const fs = require("fs");
  
    if (req.body.customUrl) {
      if (req.body.shortDescription.trim() === '') {
        return res.status(400).json({ description: 'Content must not be empty' });
      }
      if (req.body.title.trim() === '') {
        return res.status(400).json({ title: 'Title must not be empty' });
      }
      if (req.body.customUrl.trim() === '') {
        return res.status(400).json({ customUrl: 'Url must not be empty' });
      }
      const newArticle = {
        createdAt: new Date().toISOString(),
        username: req.user.username,
        userId: req.user.userId,
        imageUrl: req.user.imageUrl,
        applicationType: 'funding',      
        fullname: req.body.fullname,
        preferredName: req.body.preferredName || '',
        pronouns: req.body.pronouns || "",
        dateOfBirth: req.body.dateOfBirth,
        email: req.body.email,
        mobile: req.body.mobile,
        address: req.body.address,
        cityOrTown: req.body.cityOrTown,
        postCode: req.body.postCode,
        referredBy: req.body.referredBy,
        involvementDetails: req.body.involvementDetails,
        primaryInterest: req.body.primaryInterest,
        financiallySupported: req.body.financiallySupported,
        employed: req.body.employed,
        jobTitle: req.body.jobTitle || "",
        totalIncome: req.body.totalIncome || 0,
        totalSavings: req.body.totalSavings || 0,
        receivingBenefits: req.body.receivingBenefits,
        benefitDetails: req.body.benefitDetails || "",
        financialCircumstances: req.body.financialCircumstances || "",
        reasonForBursary: req.body.reasonForBursary,
        costBreakdown: req.body.costBreakdown,
        fundingProgressionPlan:req.body.fundingProgression,
        monthlyBudgetBreakDown: req.body.monthlyBudgetBreakDown,
      };
  
      db.collection('news')
          .add(newArticle)
          .then((doc) => {
            const resArticle = newArticle;
            resArticle.newsId = doc.id;
            res.json(resArticle);
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({ error: 'Something went wrong' });
          });
    } else {
      const busboy = new BusBoy({ headers: req.headers });
      const grantId = req.params.grantId
      const userId = req.user.userId
      const username = req.user.username
  
      let imagesToBeUploaded = [];
      let imageFileName = {};
      let generatedToken = uuid();
      let imageToAdd = {}
      let uploadUrls = [];
      let newAppilcation = {};
  
  
      busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
        // console.log('Field [' + fieldname + ']: value: ' + inspect(val));
        newAppilcation[fieldname] = val
      });
  
      busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
        if (mimetype !== "image/jpeg" && mimetype !== "image/jpg" && mimetype !== "image/png" 
        && mimetype !== "video/mp4" && mimetype !== "video/swf" && mimetype !== "application/msword"
        && mimetype !== "application/pdf" && mimetype !== "text/csv" && mimetype !== "video/mpeg"
        && mimetype !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          return res.status(400).json({ error: "Wrong file type submitted" });
        }
        const imageExtension = filename.split(".")[filename.split(".").length - 1];
        // 32756238461724837.png
        imageFileName = `${Math.round(
          Math.random() * 1000000000000
        ).toString()}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), path.basename(imageFileName));
        imageToAdd = {
          imageFileName,
          filepath,
          mimetype
        }
        // imagesToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
        imagesToBeUploaded.push(imageToAdd)
      });
  
      busboy.on("finish", async () => {
        let promises = [];
  
        imagesToBeUploaded.forEach((imageToBeUploaded) => {
  
          uploadUrls.push(
            `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/application-uploads%2F${imagesToBeUploaded.imageFileName}?alt=media&token=${generatedToken}`
          );
          
          promises.push(
            admin
              .storage()
              .bucket(config.storageBucket)
              .upload(imagesToBeUploaded.filepath, {
                destination: `application-uploads/${imageFileName}`,
                resumable: false,
                metadata: {
                  metadata: {
                    contentType: imageToBeUploaded.mimetype,
                    //Generate token to be appended to imageUrl
                    firebaseStorageDownloadTokens: generatedToken,
                  },
                }, 
              })
  
          );
        });
  
        try {
          await Promise.all(promises);
  
          return response.json({
            success: `Uploads URL: ${uploadUrls}`,
          });
        } catch (err) {
          console.log(err);
          response.status(500).json(err);
        }
        
        const uploadUrl = uploadUrls
        newAppilcation.uploadUrl = uploadUrl;
        newAppilcation.userId = userId;
        newAppilcation.username = username;
        newAppilcation.applicationType = 'funding';
        newAppilcation.garntId = grantId;
        newAppilcation.createdAt = new Date().toISOString();
  
        db.collection(`grants/${req.params.grantId}/submissions/${userId}`)
          .set(newAppilcation)
          .then((doc) => {
            const resAppilcation = newAppilcation;
            resAppilcation.Id = doc.id;
            return res.status(200).json({ success: resAppilcation });
          })
          .catch((err) => {
            res.status(500).json({ error: 'something went wrong' });
            console.error(err);
          });
      });
  
      busboy.end(req.rawBody);
    }
    
};