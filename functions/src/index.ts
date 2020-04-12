// Firebase Config
import * as functions from 'firebase-functions';
// Sendgrid Config
import * as sgMail from '@sendgrid/mail';
import { onlyAlpha, emailPattern } from './constants/constants';

const API_KEY = functions.config().sendgrid.key;
const templateId = functions.config().sendgrid.template;
const from = functions.config().sendgrid.from;

sgMail.setApiKey(API_KEY);

// Owner Account details
const ACCOUNT_DETAILS = {
    from,
    templateId,
}

const validateEmail=(value:any, pattern:string):boolean => {       
    const receivedValue = value.toLowerCase().trim();
    
    switch (pattern) {
        case 'email':
            return emailPattern.test(String(receivedValue));
        case 'alpha':
            return onlyAlpha.test(String(receivedValue));
        default:
            return false;
    }
}
// Sends email via HTTP. Can be called from frontend code. 
exports.cffSendgridEmail = functions.https.onCall(async (data, context:any) => {
    try {
        
        if (!context.auth && !context.auth.token.email) {
            throw new functions.https.HttpsError('failed-precondition', 'Must be logged with an email address');
        }
        if(!data.delegateEmailDetails || !data.delegateEmailDetails.dynamic_template_data){
            throw new functions.https.HttpsError('invalid-argument', `Root keys are missing`);
        }else{
            Object.entries(data.delegateEmailDetails).forEach(([key, value])=>{
                if(key==='to'){
                    if(!validateEmail(value,'email')){
                        throw new functions.https.HttpsError('invalid-argument', `Value validation failed`);
                    }
                }
                if(key==='dynamic_template_data'){
                    Object.entries(data.delegateEmailDetails.dynamic_template_data).forEach(([template_key, template_value])=>{
                        if(!validateEmail(template_value,'alpha')){
                            throw new functions.https.HttpsError('invalid-argument', `dynamic_template_data value validation failed`);
                        };
                    });
                }
            });
        }
        
        const msg = {...ACCOUNT_DETAILS, ...data.delegateEmailDetails};
        await sgMail.send(msg);
        console.log(`Email sent successfully ${JSON.stringify(data)} by logged in user: ${context.auth.token.email} of ${context.auth.token.aud} application`);
        return {
            success: true
        };
    }
    catch (error) {
        console.log(`${error}, occurred while executing for ${JSON.stringify(data)}, sent by logged in user: ${context.auth.token.email} of ${context.auth.token.aud} application`);
        return {
            success: false
        };
    }
});