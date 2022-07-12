const { admin, db } = require("../utils/admin");

// Education
exports.addEducation = (req, res) => {
    if (req.body.courseName.trim() === '')
      return res.status(400).json({ Course: 'Must not be empty' });
    if (req.body.schoolName.trim() === '')
      return res.status(400).json({ Institution: 'Must not be empty' });
    if (req.body.schoolLocation.trim() === '')
      return res.status(400).json({ Location: 'Must not be empty' });
  
    let gradeAchieved;
    if (req.body.gradeAchieved === "true" || req.body.gradeAchieved === true) {
      gradeAchieved = true
    } else {
      gradeAchieved = false
    }

    const newEducation = {
      courseName: req.body.courseName,
      schoolName: req.body.schoolName,
      schoolLocation: req.body.schoolLocation,
      startYear: req.body.startYear,
      endYear: req.body.endYear,
      finalGrade: req.body.finalGrade,
      gradeAchieved: gradeAchieved,
      fieldOfStudy: req.body.fieldOfStudy,
      createdAt: new Date().toISOString(),
      username: req.user.username,
      userId: req.user.userId,
      userImage: req.user.imageUrl 
    };
  
    db.collection(`users/${req.user.userId}/educations`)
      .add(newEducation)
      .then((doc) => {
        const resEducation = newEducation;
        resEducation.educationId = doc.id;
        res.json(resEducation);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });
}

exports.deleteEducation = (req, res) => {
    const educationDoc = db.doc(`users/${req.user.userId}/educations/${req.params.educationId}`);
    educationDoc
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Education details not found' });
        } else {
          return educationDoc.delete();
        }
      })
      .then(() => {
        res.json({ message: 'Education details deleted successfully' });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
}

exports.updateEducation = (req, res) => {
    let educationDetails = req.body;
    db.doc(`users/${req.user.userId}/educations/${req.params.educationId}`)
      .update(educationDetails)
      .then(() => {
        // if (!doc.exists) {
        //   return res.status(404).json({ error: 'Course not found' });
        // }
        return res.json({ message: "Course updated successfully", educationDetails });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
};

// Experiences
exports.addExperience = (req, res) => {
    if (req.body.jobTitle.trim() === '')
      return res.status(400).json({ Job: 'Must not be empty' });
    if (req.body.companyName.trim() === '')
      return res.status(400).json({ Conmpany: 'Must not be empty' });
    if (req.body.location.trim() === '')
      return res.status(400).json({ Location: 'Must not be empty' });

    let currentRole;
    if (req.body.currentRole === "true" || req.body.currentRole === true) {
      currentRole = true
    } else {
      currentRole = false
    }
    const newExperience = {
      jobTitle: req.body.jobTitle,
      companyName: req.body.companyName,
      location: req.body.location,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      employmentType: req.body.employmentType,
      currentRole: currentRole,
      createdAt: new Date().toISOString(),
      username: req.user.username,
      userId: req.user.userId,
      userImage: req.user.imageUrl 
    };
  
    db.collection(`users/${req.user.userId}/experiences`)
      .add(newExperience)
      .then((doc) => {
        const resExperience = newExperience;
        resExperience.experienceId = doc.id;
        res.json(resExperience);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });
  
}

exports.deleteExperience = (req, res) => {
    const experienceDoc = db.doc(`users/${req.user.userId}/experiences/${req.params.experienceId}`);
    experienceDoc
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Experience not found' });
        } else {
          return experienceDoc.delete();
        }
      })
      .then(() => {
        res.json({ message: 'Experience deleted successfully' });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
}

exports.updateExperience = (req, res) => {
    let experienceDetails = req.body;
    db.doc(`users/${req.user.userId}/experiences/${req.params.experienceId}`)
      .update(experienceDetails)
      .then(() => {
        return res.json({ message: "Experience updated successfully",  experienceDetails});
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
};

// Knowledge & Skills
exports.addSkills = (req, res) => {
    if (req.body.knowledgeList === [] || req.body.skillsList === [])
      return res.status(400).json({ knowledgeList: 'Must not be empty' });
    
    const newSkill = {
      knowledgeList: req.body.knowledgeList,
      skillsList: req.body.skillsList,
      otherSkillsList: req.body.otherSkillsList,
      createdAt: new Date().toISOString(),
      username: req.user.username,
      userId: req.user.userId,
      userImage: req.user.imageUrl 
    };
  
    db.collection(`users/${req.user.userId}/skills`)
      .add(newSkill)
      .then((doc) => {
        const resSkill = newSkill;
        resSkill.skillsId = doc.id;
        res.json(resSkill);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });
  
}

exports.deleteSkills = (req, res) => {
    const skillsDoc = db.doc(`users/${req.user.userId}/skills/${req.params.skillId}`);
    skillsDoc
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Skill not found' });
        } else {
          return skillsDoc.delete();
        }
      })
      .then(() => {
        res.json({ message: 'Skill deleted successfully' });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
}

exports.updateSkills = (req, res) => {
    let skillDetails = req.body;
    db.doc(`users/${req.user.userId}/skills/${req.params.skillId}`)
      .update(skillDetails)
      .then(() => {
        // if (!doc.exists) {
        //   return res.status(404).json({ error: 'Skill not found' });
        // }
        return res.json({ message: "Skill updated successfully", skillDetails });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
};

// Interests
exports.addInterestsOld = (req, res) => {
  if (req.body.interestList === [])
    return res.status(400).json({ interestList: 'Must not be empty' });

  const newInterest = {
    interestList: req.body.interestList,
    otherInterestList: req.body.otherInterestList,
    createdAt: new Date().toISOString(),
    username: req.user.username,
    userId: req.user.userId,
    userImage: req.user.imageUrl,
  };

  db.collection(`users/${req.user.userId}/interests`)
    .add(newInterest)
    .then((doc) => {
      const resInterest = newInterest;
      resInterest.interestId = doc.id;
      res.json(resInterest);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: 'Something went wrong' });
    });
};

exports.addInterests = (req, res) => {
  const interests = req.body.interestList;

  db.doc(`users/${req.user.userId}`)
    .update({ interests })
    .then(() => {
       return res.json({
         message: 'Interests updated successfully',
         interests,
       });
    })
    .catch((err) => {
      console.log(err);
      res
        .status(500)
        .json({ error: 'Something went wrong  please try again later' });
    });
};

exports.deleteInterest = (req, res) => {
    const interestDoc = db.doc(`users/${req.user.userId}/interests/${req.params.interestId}`);
    interestDoc
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Interest not found' });
        } else {
          return interestDoc.delete();
        }
      })
      .then(() => {
        res.json({ message: 'Interest deleted successfully' });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
}

exports.updateInterest = (req, res) => {
    let interestDetails = req.body;
    db.doc(`users/${req.user.userId}`)
      .update(interestDetails)
      .then(() => {
        // if (!doc.exists) {
        //   return res.status(404).json({ error: 'Interest not found' });
        // }
        return res.json({ message: "Interest updated successfully", interestDetails });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
};

// preferred Industries

exports.addPreferredIndustries = (req, res) => {
  const preferredIndustries = req.body.industriesList;

  db.doc(`users/${req.user.userId}`)
    .update({ preferredIndustries })
    .then(() => {
      return res.json({
        message: 'preferred industries updated successfully',
        preferredIndustries,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: 'Something went wrong, please try again later'});
    });
};