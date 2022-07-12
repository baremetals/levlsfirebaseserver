const functions = require("firebase-functions");
const app = require('express')();
const adminRoutes = require('./routes/admin.routes')
const userRoutes = require('./routes/user.routes')
const orgRoutes = require('./routes/organisation.routes')
const uploadRoutes = require('./routes/upload.routes')
const eventRoutes = require('./routes/event.routes')
const projectRoutes = require('./routes/project.routes')
const newsRoutes = require('./routes/news.routes')
const articleRoutes = require('./routes/article.routes')
const resourcesRoutes = require('./routes/resources.routes')
const grantRoutes = require('./routes/grant.routes')
const aboutUserRoutes = require('./routes/aboutUser.routes')
const apprenticeRoutes = require('./routes/apprentice.routes')
const internshipRoutes = require('./routes/internship.routes')
const sgMail = require('@sendgrid/mail')
const config = require("./utils/database");
const cors = require('cors');


app.use(cors());

app.use('/', adminRoutes)
app.use('/', userRoutes)
app.use('/', orgRoutes)
app.use('/', projectRoutes)
app.use('/', uploadRoutes)
app.use('/', eventRoutes)
app.use('/', newsRoutes)
app.use('/', articleRoutes)
app.use('/', resourcesRoutes)
app.use('/', grantRoutes)
app.use('/', apprenticeRoutes)
app.use('/', internshipRoutes)
app.use('/', aboutUserRoutes)

sgMail.setApiKey(config.sendgridApi)

exports.api = functions.region('europe-west2').https.onRequest(app);

exports.userFunctions = require('./cloudFunctions/user.functions')
exports.newsFunctions = require('./cloudFunctions/news.functions')
exports.eventsFunctions = require('./cloudFunctions/events.functions')
exports.uploadFunctions = require('./cloudFunctions/upload.functions')
exports.projectFunctions = require('./cloudFunctions/project.functions')
exports.articleFunctions = require('./cloudFunctions/article.functions')
exports.userSearchFunctions = require('./cloudFunctions/userSearch.functions')
exports.apprenticeFunctions = require('./cloudFunctions/apprentice.functions')
exports.internFunctions = require('./cloudFunctions/intern.functions');
exports.grantFunctions = require('./cloudFunctions/grant.functions');
exports.resourceFunctions = require('./cloudFunctions/resource.functions')