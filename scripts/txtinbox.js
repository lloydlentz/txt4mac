'use strict';

// Initializes TxtInbox.
function TxtInbox() {
  this.checkSetup();

  // Shortcuts to DOM Elements.
  this.inboxqList = document.getElementById('inboxq');
  this.messageCard = document.getElementById('messages-card');
  this.messageList = document.getElementById('messages');
  this.messageForm = document.getElementById('message-form');
  this.messageInput = document.getElementById('message');
  this.submitButton = document.getElementById('submit');
  this.submitImageButton = document.getElementById('submitImage');
  this.imageForm = document.getElementById('image-form');
  this.mediaCapture = document.getElementById('mediaCapture');
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');

  this.newnumberInput  = document.getElementById('newnumber');
  this.newnumberForm   = document.getElementById('newnumber-form');
  this.newnumberSubmit = document.getElementById('newnumbersubmit');

  // Saves message on form submit.
  this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
  this.newnumberForm.addEventListener('submit', this.addNumber.bind(this));
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.signInButton.addEventListener('click', this.signIn.bind(this));

  // Toggle for the button.
  var buttonTogglingHandler = this.toggleButton.bind(this);
  this.messageInput.addEventListener('keyup', buttonTogglingHandler);
  this.messageInput.addEventListener('change', buttonTogglingHandler);

  // Toggle for the newnumberbutton.
  var buttonNewnumberTogglingHandler = this.toggleNewnumberButton.bind(this);
  this.newnumberInput.addEventListener('keyup', buttonNewnumberTogglingHandler);
  this.newnumberInput.addEventListener('change', buttonNewnumberTogglingHandler);

  // Events for image upload.
  // this.submitImageButton.addEventListener('click', function(e) {
  //   e.preventDefault();
  //   this.mediaCapture.click();
  // }.bind(this));
//  this.mediaCapture.addEventListener('change', this.saveImageMessage.bind(this));

  this.messageCard.setAttribute('hidden', 'true');

  this.initFirebase();

  // Reference to the /messages/ database path.
  this.contactRef = this.database.ref('contact');
  // Make sure we remove all previous listeners.
  this.contactRef.off();

}

// Sets up shortcuts to Firebase features and initiate firebase auth.
TxtInbox.prototype.initFirebase = function() {
  // Shortcuts to Firebase SDK features.
  this.auth = firebase.auth();
  this.database = firebase.database();
  // this.storage = firebase.storage();
  // Initiates Firebase auth and listen to auth state changes.
  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};



// Loads chat messages history and listens for upcoming ones.
TxtInbox.prototype.loadMessages = function() {
  // Reference to the /messages/ database path.
  this.messagesRef = this.database.ref('messages');
  // Make sure we remove all previous listeners.
  this.messagesRef.off();

  // Loads the last 12 messages and listen for new ones.
  var setMessage = function(data) {
    var val = data.val();
    this.displayMessage(data.key, val.name, val.text, val.photoUrl, val.imageUrl);
  }.bind(this);
  this.messagesRef.limitToLast(12).on('child_added', setMessage);
  this.messagesRef.limitToLast(12).on('child_changed', setMessage);
};

// Loads chat messages history and listens for upcoming ones.
TxtInbox.prototype.loadContact = function() {
  // Loads the last 12 messages and listen for new ones.
  var setContact = function(data) {
    var val = data.val();
    this.displayMessage(data.key, val.name, val.text, val.photoUrl, val.imageUrl);
  }.bind(this);
  this.contactRef.limitToLast(12).on('child_added', setContact);
  this.contactRef.limitToLast(12).on('child_changed', setContact);
};

// Loads chat messages history and listens for upcoming ones.
TxtInbox.prototype.loadInboxQ = function() {
  // Reference to the /messages/ database path.
  this.messagesRefQ = this.database.ref('inboxq').orderByChild('ts');
  // Make sure we remove all previous listeners.
  this.messagesRefQ.off();

  // Loads the last 12 messages and listen for new ones.
  var setMessageQ = function(data) {
    var val = data.val();
    this.displayInboxQ(data.key, val.new);
  }.bind(this);
  this.messagesRefQ.limitToLast(12).on('child_added', setMessageQ);
  this.messagesRefQ.limitToLast(12).on('child_changed', setMessageQ);
};

// Saves a new message on the Firebase DB.
TxtInbox.prototype.saveMessage = function(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (this.messageInput.value && this.checkSignedInWithMessage()) {


    var currentUser = this.auth.currentUser;
    console.log('current #' + this.currentNumber);
    // Add a new message entry to the Firebase Database.
    var logMessage = {
      to: this.currentNumber,
      body: this.messageInput.value,
//      currentUser: currentUser,
      name: currentUser.displayName,
      email: currentUser.email,
      photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
    };
    console.log(logMessage);
    this.contactRef.push(logMessage).then(function() {
      // Clear message text field and SEND button state.
      this.database.ref('/inbox/'+this.currentNumber ).push(logMessage);
      TxtInbox.resetMaterialTextfield(this.messageInput);
      this.toggleButton();
    }.bind(this)).catch(function(error) {
      console.error('Error writing new message to Firebase Database', error);
    });

  }
};

// Saves a new message on the Firebase DB.
TxtInbox.prototype.addNumber = function(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (this.newnumberInput.value && this.checkSignedInWithMessage()) {
    // Add a new number to the inboxq
    this.database.ref('/inboxq/'+this.newnumberInput.value + '/new').set(true).then(function() {
      // Clear message text field and SEND button state.
      TxtInbox.resetMaterialTextfield(this.newnumberInput);
      this.toggleNewnumberButton();
    }.bind(this)).catch(function(error) {
      console.error('Error writing new message to Firebase Database', error);
    });

  }
};

// Saves a new message on the Firebase DB.
TxtInbox.prototype.loadThread = function(e) {

  console.log(e);
  this.messageList.innerHTML = '';

  if (this.inboxRef){
    console.log('remove old ref')
    this.inboxRef.off('child_added');
  }

  // https://stackoverflow.com/questions/1553661/how-to-get-the-onclick-calling-object
  e = e || window.event;
  var targ = e.target || e.srcElement;
  if (targ.nodeType == 3) targ = targ.parentNode; // defeat Safari bug
  var elem = targ.closest("div .inboxq-container");
//  console.log(targ);
  console.log(elem);

  this.currentNumber = elem.id;
  console.log(this.currentNumber);

  // Reference to the /messages/ database path.
  this.inboxRef = this.database.ref('inbox/'+this.currentNumber).orderByChild('ts');
  // Make sure we remove all previous listeners.
  this.inboxRef.off();

  this.database.ref('/inboxq/'+this.currentNumber + '/new').set(false);

  // Loads the last 12 messages and listen for new ones.
  var setThread = function(data) {
    var val = data.val();
    this.displayThread(data.key,val.body || val.Body, val.name || val.From, val.photoUrl, new Date(val.ts));
  }.bind(this);
  this.inboxRef.on('child_added', setThread);
};





// // Sets the URL of the given img element with the URL of the image stored in Cloud Storage.
// TxtInbox.prototype.setImageUrl = function(imageUri, imgElement) {
//   // If the image is a Cloud Storage URI we fetch the URL.
//   if (imageUri.startsWith('gs://')) {
//     imgElement.src = TxtInbox.LOADING_IMAGE_URL; // Display a loading image first.
//     this.storage.refFromURL(imageUri).getMetadata().then(function(metadata) {
//       imgElement.src = metadata.downloadURLs[0];
//     });
//   } else {
//     imgElement.src = imageUri;
//   }
// };

// Saves a new message containing an image URI in Firebase.
// This first saves the image in Firebase storage.
// TxtInbox.prototype.saveImageMessage = function(event) {
//   event.preventDefault();
//   var file = event.target.files[0];

//   // Clear the selection in the file picker input.
//   this.imageForm.reset();

//   // Check if the file is an image.
//   if (!file.type.match('image.*')) {
//     var data = {
//       message: 'You can only share images',
//       timeout: 2000
//     };
//     this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
//     return;
//   }
//   // Check if the user is signed-in
//   if (this.checkSignedInWithMessage()) {

//     // We add a message with a loading icon that will get updated with the shared image.
//     var currentUser = this.auth.currentUser;
//     this.messagesRef.push({
//       name: currentUser.disp;layName,
//       imageUrl: TxtInbox.LOADING_IMAGE_URL,
//       photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
//     }).then(function(data) {

//       // Upload the image to Cloud Storage.
//       var filePath = currentUser.uid + '/' + data.key + '/' + file.name;
//       return this.storage.ref(filePath).put(file).then(function(snapshot) {

//         // Get the file's Storage URI and update the chat message placeholder.
//         var fullPath = snapshot.metadata.fullPath;
//         return data.update({imageUrl: this.storage.ref(fullPath).toString()});
//       }.bind(this));
//     }.bind(this)).catch(function(error) {
//       console.error('There was an error uploading a file to Cloud Storage:', error);
//     });

//   }
// };

// Signs-in Friendly Chat.
TxtInbox.prototype.signIn = function() {
  // Sign in Firebase using popup auth and Google as the identity provider.
  var provider = new firebase.auth.GoogleAuthProvider();
  this.auth.signInWithPopup(provider);
};

// Signs-out of Friendly Chat.
TxtInbox.prototype.signOut = function() {
  // Sign out of Firebase. 
  this.auth.signOut();
};

// Triggers when the auth state change for instance when the user signs-in or signs-out.
TxtInbox.prototype.onAuthStateChanged = function(user) {
  if (user) { // User is signed in!
    // Get profile pic and user's name from the Firebase user object.
    var profilePicUrl = user.photoURL; 
    var userName = user.displayName;

    // Set the user's profile pic and name.
    this.userPic.style.backgroundImage = 'url(' + profilePicUrl + ')';
    this.userName.textContent = userName;

    // Show user's profile and sign-out button.
    this.userName.removeAttribute('hidden');
    this.userPic.removeAttribute('hidden');
    this.signOutButton.removeAttribute('hidden');

    // Hide sign-in button.
    this.signInButton.setAttribute('hidden', 'true');

    // User is signed in.
    var displayName = user.displayName;
    var email = user.email;
    var emailVerified = user.emailVerified;
    var photoURL = user.photoURL;
    var isAnonymous = user.isAnonymous;
    var uid = user.uid;
    var providerData = user.providerData;
    var userJSON = JSON.stringify(user, null, '  ');
    // [START_EXCLUDE]
    document.getElementById('current-user-name').textContent = displayName;
    document.getElementById('quickstart-sign-in-status').textContent = 'Signed in';
    document.getElementById('user-pic-img').src = profilePicUrl;
    // console.log(profilePicUrl);
    // document.getElementById('quickstart-sign-in').textContent = 'Sign out';
    document.getElementById('quickstart-account-details').textContent = userJSON;

    var uu = {
      displayName : displayName,
      email : email,
      emailVerified: emailVerified,
      photoURL: photoURL,
      isAnonymous: isAnonymous,
      uid : uid,
      providerData: providerData,
      userJSON: userJSON
    }

    this.database.ref('/users/'+ user.uid ).set(uu).then(function() {
      // Clear message text field and SEND button state.
      console.log("saved " + user.uid);
    }.bind(this)).catch(function(error) {
      console.error('Error writing new message to Firebase Database', error);
    });



    // We load currently existing chant messages.

//    this.loadContact();
//    this.loadMessages();
    this.loadInboxQ();

    // We save the Firebase Messaging Device token and enable notifications.
    this.saveMessagingDeviceToken();
  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    this.userName.setAttribute('hidden', 'true');
    this.userPic.setAttribute('hidden', 'true');
    this.signOutButton.setAttribute('hidden', 'true');

    this.inboxqList.innerHTML = "";

    // Show sign-in button.
    this.signInButton.removeAttribute('hidden');
    // User is signed out.
    // [START_EXCLUDE]
    document.getElementById('current-user-name').textContent = 'Signed out';
    document.getElementById('quickstart-sign-in-status').textContent = 'Signed out';
    // document.getElementById('quickstart-sign-in').textContent = 'Sign in with Google';
    document.getElementById('quickstart-account-details').textContent = 'null';
    document.getElementById('quickstart-oauthtoken').textContent = 'null';

  }
};

// Returns true if user is signed-in. Otherwise false and displays a message.
TxtInbox.prototype.checkSignedInWithMessage = function() {
  // Return true if the user is signed in Firebase
  if (this.auth.currentUser) {
    return true;
  }

  // Display a message to the user using a Toast.
  var data = {
    message: 'You must sign-in first',
    timeout: 2000
  };
  this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
  return false;
};

// // Saves the messaging device token to the datastore.
TxtInbox.prototype.saveMessagingDeviceToken = function() {
  //TODO : REenable messaging

//   firebase.messaging().getToken().then(function(currentToken) {
//     if (currentToken) {
//       console.log('Got FCM device token:', currentToken);
//       // Saving the Device Token to the datastore.
//       firebase.database().ref('/fcmTokens').child(currentToken)
//           .set(firebase.auth().currentUser.uid);
//     } else {
//       // Need to request permissions to show notifications.
//       this.requestNotificationsPermissions();
//     }
//   }.bind(this)).catch(function(error){
//     console.error('Unable to get messaging token.', error);
//   });
// };

// // Requests permissions to show notifications.
// TxtInbox.prototype.requestNotificationsPermissions = function() {
//   console.log('Requesting notifications permission...');
//   firebase.messaging().requestPermission().then(function() {
//     // Notification permission granted.
//     this.saveMessagingDeviceToken();
//   }.bind(this)).catch(function(error) {
//     console.error('Unable to get permission to notify.', error);
//   });
};

// Resets the given MaterialTextField.
TxtInbox.resetMaterialTextfield = function(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

// Template for messages.
TxtInbox.MESSAGE_TEMPLATE =
    '<div class="message-container mdl-shadow--2dp">' +
      '<div class="message"></div>' +
      '<div class="name"></div>' +
    '</div>';

// A loading image URL.
TxtInbox.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

// Displays a Message in the UI.
TxtInbox.prototype.displayMessage = function(key, name, text, picUrl, imageUri) {
  var div = document.getElementById(key);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = TxtInbox.MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.messageList.appendChild(div);
  }
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
  }
  div.querySelector('.name').textContent = name;
  var messageElement = div.querySelector('.message');
  if (text) { // If the message is text.
    messageElement.textContent = text;
    // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (imageUri) { // If the message is an image.
    var image = document.createElement('img');
    image.addEventListener('load', function() {
      this.messageList.scrollTop = this.messageList.scrollHeight;
    }.bind(this));
    this.setImageUrl(imageUri, image);
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // Show the card fading-in.
  setTimeout(function() {div.classList.add('visible')}, 1);
  this.messageList.scrollTop = this.messageList.scrollHeight;
  this.messageInput.focus();
};

// Template for messages.
TxtInbox.INBOXQ_TEMPLATE =
    '<a class="mdl-navigation__link inboxq-container">' +
      '<div class="spacing"><i class="material-icons isnew"></i></div>' +
      '<div class="number"></div>' +
    '</a>';

// Displays a Message in the UI.
TxtInbox.prototype.displayInboxQ = function(key,isnew) {
  var div = document.getElementById(key);
  // If an element for that message does not exists yet we create it.
  if(div){
    div.remove();
  }
  // if (!div) {
    var container = document.createElement('div');
    container.innerHTML = TxtInbox.INBOXQ_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    var star = div.querySelector('.isnew');
    if(isnew){
      star.innerHTML = "grade";
    }
    this.inboxqList.insertBefore(div,this.inboxqList.childNodes[0]);
  // }
  div.querySelector('.number').textContent = key;

  // Show the card fading-in.
  setTimeout(function() {div.classList.add('visible')}, 1);
  this.inboxqList.scrollTop = this.inboxqList.scrollHeight;

  div.addEventListener('click', this.loadThread.bind(this),false);

};

// Template for messages.
TxtInbox.THREAD_TEMPLATE =
    '<div class="message-container mdl-layout mdl-shadow--2dp">' +
      '<div class="mdl-layout-spacer"></div>' +
      '<div class="body"></div>' +
      '<div class="from"></div><img class="pic"></img>' +
      '<div class="when"></div>' +
    '</div>';

// <div class="mdl-layout__header-row">
//       <!-- Title -->
//       <span class="mdl-layout-title">Title</span>
//       <!-- Add spacer, to align navigation to the right -->
//       <div class="mdl-layout-spacer"></div>
//       <!-- Navigation -->
//       <nav class="mdl-navigation">
//         <a class="mdl-navigation__link" href="">Link</a>
//         <a class="mdl-navigation__link" href="">Link</a>
//         <a class="mdl-navigation__link" href="">Link</a>
//         <a class="mdl-navigation__link" href="">Link</a>
//       </nav>
//     </div>


// Displays a Message in the UI.
TxtInbox.prototype.displayThread = function(key,body,from,photoUrl,ts) {

  this.messageCard.removeAttribute('hidden');
  var div = document.getElementById(key);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = TxtInbox.THREAD_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.messageList.appendChild(div);
  }
  if(from != this.currentNumber){
    div.classList.add("me");
  }
  div.querySelector('.from').textContent = from;
  div.querySelector('.when').textContent = ts.toLocaleDateString() + ' ' + ts.toLocaleTimeString();
  var messageElement = div.querySelector('.body');
  if (photoUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + photoUrl + ')';
  }    messageElement.textContent = body;
  // Replace all line breaks by <br>.
  messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  // Show the card fading-in.
  setTimeout(function() {div.classList.add('visible')}, 1);
  this.messageList.scrollTop = this.messageList.scrollHeight;

};

// Enables or disables the submit button depending on the values of the input
// fields.
TxtInbox.prototype.toggleButton = function() {
  if (this.messageInput.value) {
    this.submitButton.removeAttribute('disabled');
  } else {
    this.submitButton.setAttribute('disabled', 'true');
  }
};

// Enables or disables the submit button depending on the values of the input
// fields.
TxtInbox.prototype.toggleNewnumberButton = function() {
  if (this.newnumberInput.value) {
    this.newnumberSubmit.removeAttribute('disabled');
  } else {
    this.newnumberSubmit.setAttribute('disabled', 'true');
  }
};

// Checks that the Firebase SDK has been correctly setup and configured.
TxtInbox.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
  }
};


// from https://gist.github.com/kmaida/6045266
function convertTimestamp(timestamp) {
  var d = new Date(timestamp * 1000), // Convert the passed timestamp to milliseconds
    yyyy = d.getFullYear(),
    mm = ('0' + (d.getMonth() + 1)).slice(-2),  // Months are zero based. Add leading 0.
    dd = ('0' + d.getDate()).slice(-2),     // Add leading 0.
    hh = d.getHours(),
    h = hh,
    min = ('0' + d.getMinutes()).slice(-2),   // Add leading 0.
    ampm = 'AM',
    time;
      
  if (hh > 12) {
    h = hh - 12;
    ampm = 'PM';
  } else if (hh === 12) {
    h = 12;
    ampm = 'PM';
  } else if (hh == 0) {
    h = 12;
  }
  
  // ie: 2013-02-18, 8:35 AM  
  time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;
    
  return time;
}