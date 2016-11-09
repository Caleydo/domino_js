/**
 * Created by Tobias Appl on 8/4/2016.
 */

// Determine the order of css files manually

// HACK! because <amd-dependency path="bootstrap" /> is loaded after all the other stylesheets and not before (as declared)
/// <amd-dependency path="css!/bower_components/bootstrap/dist/css/bootstrap" />

/// <amd-dependency path="font-awesome" />
/// <amd-dependency path="css!../caleydo_bootstrap_fontawesome/style.css" />
/// <amd-dependency path="css!./style.css"/>

import domino = require('./Domino');

var dominoApplication = domino.create();
dominoApplication.execute();
