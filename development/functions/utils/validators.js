const validator = require('validator');

  
exports.validateSignupData = (data) => {
    let errors = {};
    let regex = /^[a-zA-Z0-9\d-_]*$/
  
    if (data.email.trim() === '') {
      errors.error = 'Please enter an email address.';
    }
    if (!validator.isEmail(data.email)) {
      errors.error = 'You must provide a valid email address.';
    }
    
    if (data.dateOfBirth.trim() === '') errors.error = 'Please enter a date of birth.';

    if (data.password.trim() === '') errors.error = 'Please enter a suitable password.';
    if (data.password.trim().length <= 5) errors.error = 'Your password must have 6 characters or more.';
    if (data.password.trim() !== data.confirmPassword)
      errors.error = 'Passwords must match!';
    
    if (data.username.trim() === '') errors.error = 'Please enter a username';
    if (data.username.trim().length <= 3) errors.error = 'Your username must have 4 characters or more.';
    if (data.username.trim().length > 15) errors.error = 'Your username must have a maximum of 15 characters.';
    if (regex.test(data.username.trim()) !== true) 
      errors.error = 'Username must only contain letters, numbers, hyphens or an underscore(a-z0-9/_)';
    
    // if (data.dateOfBirth.trim() === '') errors.dateOfBirth = 'Please your date of birth';
  
    return {
      errors,
      valid: Object.keys(errors).length === 0 ? true : false
    };
};
  
exports.validateLoginData = (data) => {
  let errors = {};

  if (data.email.trim() === '') errors.error = 'Please enter your email address.';
  if (data.password.trim() === '') errors.error = 'Please enter your password.';

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.reduceOrganisationDetails = (data) => {
  let orgDetails = {};

  // if (data.bio.trim() !== '') orgDetails.bio = data.bio;
  if (data.website.trim() !== '') {
    // https://website.com
    if (data.website.trim().substring(0, 4) !== 'http') {
      orgDetails.website = `http://${data.website.trim()}`;
    } else orgDetails.website = data.website;
  }
  if (data.organisationName.trim() !== '') orgDetails.organisationName = data.organisationName;
  if (data.organisationType.trim() !== '') orgDetails.organisationType = data.organisationType;
  if (data.founded.trim() !== '') orgDetails.founded = data.founded;
  if (data.industry.trim() !== '') orgDetails.industry = data.industry;
  if (data.companySize.trim() !== '') orgDetails.companySize = data.companySize;
  if (data.slogan.trim() !== '') orgDetails.slogan = data.slogan;
  if (data.instagram.trim() !== '') orgDetails.instagram = data.instagram;
  if (data.linkedIn.trim() !== '') orgDetails.linkedIn = data.linkedIn;
  if (data.twitter.trim() !== '') orgDetails.twitter = data.twitter;
  if (data.tiktok.trim() !== '') orgDetails.tiktok = data.tiktok;
  if (data.numberOrname.trim() !== '') orgDetails.numberOrname = data.numberOrname;
  if (data.street.trim() !== '') orgDetails.street = data.street;
  if (data.city.trim() !== '') orgDetails.city = data.city;
  if (data.postcode.trim() !== '') orgDetails.postcode = data.postcode;
  
  return orgDetails;
};
  
exports.reduceUserDetails = (data) => {
    let userDetails = {};
  
    // if (data.bio.trim() !== '') userDetails.bio = data.bio;
    if (data.website.trim() !== '') {
      // https://website.com
      if (data.website.trim().substring(0, 4) !== 'http') {
        userDetails.website = `http://${data.website.trim()}`;
      } else userDetails.website = data.website;
    }
    if (data.fullname.trim() !== '') userDetails.fullname = data.fullname;
    if (data.occupation.trim() !== '') userDetails.occupation = data.occupation;
    if (data.mobile.trim() !== '') userDetails.mobile = data.mobile;
    if (data.gender.trim() !== '') userDetails.gender = data.gender;
    if (data.instagram.trim() !== '') userDetails.instagram = data.instagram;
    if (data.linkedIn.trim() !== '') userDetails.linkedIn = data.linkedIn;
    if (data.twitter.trim() !== '') userDetails.twitter = data.twitter;
    if (data.tiktok.trim() !== '') userDetails.tiktok = data.tiktok;
    if (data.numberOrname.trim() !== '') userDetails.numberOrname = data.numberOrname;
    if (data.street.trim() !== '') userDetails.street = data.street;
    if (data.city.trim() !== '') userDetails.city = data.city;
    if (data.postcode.trim() !== '') userDetails.postcode = data.postcode;
    if (data.country.trim() !== '') userDetails.country = data.country || England;
    
    return userDetails;
};

exports.reduceBioDetails = (data) => {
  let bioDetails = {};
  if (data.bio.trim() !== '') bioDetails.bio = data.bio;
  return bioDetails;
};

exports.validateEmailData = (data => {
  let errors = {};
  
  if (data.trim() === '') errors.error = 'Please enter an email address.';
  if (!validator.isEmail(data.trim())) {
    errors.error = 'You must provide a valid email address.';
  }
  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
})

exports.validatePasswordChange = (data => {
  let errors = {};
  if (data.password.trim() === '') errors.error = 'Please enter a suitable password.';
  if (data.password.trim() !== data.confirmPassword) errors.error = 'Passwords must match!';
  if (data.password.trim().length <= 5) errors.error = 'Your password must have 6 characters or more.';
  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
})
