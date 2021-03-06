/*
 * This is an unsupported module for retrieving data from Extra Life.
 * As Extra Life does not officially provide an API, this module may
 * stop working or may not work as expected at any time. If there are
 * connectivity issues or if the data is not coming back as expected,
 * there is a good chance that something changed on the Extra Life side.
 *
 * No warranty is implied or provided.
 *
 * @author illusionaryone
 */

(function() {

    /**
     * NOTICE: YOU MUST MANUALLY CONFIGURE THIS VARIABLE HERE. THIS IS YOUR
     * INTERNAL ID WITH EXTRALIFE. 
     *
     * Go to Extra Life and click the applicable link to make a donation to
     * yourself. Look at the URL:
     * https://www.extra-life.org/index.cfm?fuseaction=donate.participant&participantID=123456
     *
     * Copy the numerical participant ID to the following variable, keeping it within the 
     * single quotes.
     *
     * The URL is calculated automatically, change it if you desire. This URL is presented
     * in chat.
     */
    var extraLifeID = '';
    var extraLifeURL = 'https://www.extra-life.org/index.cfm?fuseaction=donate.participant&participantID=' + extraLifeID;

    /**
     * NOTICE: Presently, this does NOT use a language file! You may change the $.say()
     * statements directly if you desire.
     */

    /**
     * @function pullExtraLifeTotalGoal
     * @return {String} userInformation
     *
     * NOTICE! The return values here are used to populate the output to PhantomBot. If you wish
     * to display different text, change values here.
     */
    function pullExtraLifeTotalGoal() {
        var url = 'http://www.extra-life.org/index.cfm?fuseaction=donordrive.participant&participantID=' + extraLifeID + '&format=json';
        var HttpResponse = Packages.com.gmt2001.HttpResponse;
        var HttpRequest = Packages.com.gmt2001.HttpRequest;
        var HashMap = Packages.java.util.HashMap;
        var responseData = HttpRequest.getData(HttpRequest.RequestType.GET, url, "", new HashMap());
        var jsonObj = JSON.parse(responseData.content);

        var totalRaised = jsonObj['totalRaisedAmount'];
        var fundRaisingGoal = jsonObj['fundraisingGoal'];

        return 'Extra Life Donation Total Raised / Goal: ' +  totalRaised + ' / ' + fundRaisingGoal + '. Thanks for all of the support!';
    }

    /**
     * @function pullExtraLifeLastDonation
     * @return {String} donationInformation
     *
     * NOTICE! The return values here are used to populate the output to PhantomBot. If you wish
     * to display different text, change values here.
     */
    function pullExtraLifeLastDonation() {
        var url = 'http://www.extra-life.org/index.cfm?fuseaction=donorDrive.participantDonations&participantID=' + extraLifeID + '&format=json';
        var HttpResponse = Packages.com.gmt2001.HttpResponse;
        var HttpRequest = Packages.com.gmt2001.HttpRequest;
        var HashMap = Packages.java.util.HashMap;
        var responseData = HttpRequest.getData(HttpRequest.RequestType.GET, url, "", new HashMap());
        var jsonObj = JSON.parse(responseData.content);

        if (jsonObj[0] === undefined) {
            return 'No recent donations found!';
        }

        var message = jsonObj[0].message;
        var donorName = jsonObj[0].donorName;
        var donationAmount = jsonObj[0].donationAmount;

        return 'Last donation was in the amount of $' + donationAmount + ' received from ' + donorName + ' with this message: ' + message;
    }

    /**
     * @function pullExtraLifeDonations
     */
    function pullExtraLifeDonationsInterval() {
        var url = 'http://www.extra-life.org/index.cfm?fuseaction=donorDrive.participantDonations&participantID=' + extraLifeID + '&format=json';
        var HttpResponse = Packages.com.gmt2001.HttpResponse;
        var HttpRequest = Packages.com.gmt2001.HttpRequest;
        var HashMap = Packages.java.util.HashMap;
        var responseData = HttpRequest.getData(HttpRequest.RequestType.GET, url, "", new HashMap());
        var jsonObj = JSON.parse(responseData.content);
        var firstRun = $.getIniDbBoolean('extralife', 'firstrun', true);

        if (jsonObj[0] === undefined) {
            if (firstRun) {
                $.inidb.set('extralife', 'firstrun', 'false');
            }
            return;
        }

        for (var i = 0; i < jsonObj.length; i++) {
            var message = jsonObj[i].message;
            var donorName = jsonObj[i].donorName;
            var donationAmount = jsonObj[i].donationAmount;
            var createdOn = jsonObj[i].createdOn;

            /* As ExtraLife does not provide a unique ID for a donation, we have to assume that createdOn is unique
             * enough to use as the last donation point in combination with the donorName.
             */
            if ($.inidb.exists('extralife', donorName + '_' + createdOn)) {
                continue;
            }

            $.inidb.set('extralife', donorName + '_' + createdOn, donationAmount);

            /* If this is the first time that this has ever been ran, do not output any data to chat. This way we do not spam out
             * any previous donations.  Do note that this will spam out any donations that are received within the interval window.
             */
            if (!firstRun) {
                $.say('Received a new donation of $' + donationAmount + ' received from ' + donorName + ' with this message: ' + message);
            }
        }

        if (firstRun) {
            $.inidb.set('extralife', 'firstrun', 'false');
        }
    }

    /**
     * @event command
     */
    $.bind('command', function(event) {
        var sender = event.getSender().toLowerCase(),
            command = event.getCommand(),
            args = event.getArgs(),
            username = (args[0] ? args[0].toLowerCase() : false);

        if (command.equalsIgnoreCase('extralife')) {
            if (extraLifeID.length == 0) {
                $.say('Sorry! The caster has not setup their Extra Life ID!');
                return;
            }

            if (args.length == 0) {
                $.say('I am participating in Extra Life! Please consider making a donation at: ' + extraLifeURL);
                return;
            }

            if (args[0].equalsIgnoreCase('total')) {
                $.say(pullExtraLifeTotalGoal());
                return;
            }

            if (args[0].equalsIgnoreCase('last')) {
                $.say(pullExtraLifeLastDonation());
                return;
            }
        }

    });

    /**
     * @event initReady
     */
    $.bind('initReady', function() {
        if ($.bot.isModuleEnabled('./systems/extraLifeSystem.js')) {
            $.registerChatCommand('./systems/extraLifeSystem.js', 'extralife', 7);

            if (extraLifeID.length > 0) {
                setInterval(function() { pullExtraLifeDonationsInterval(); }, 20e3);
            }
        }
    });


})();
