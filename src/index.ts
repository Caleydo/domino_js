/**
 * Created by Tobias Appl on 8/4/2016.
 */

// Determine the order of css files manually
import 'file?name=index.html!extract!html!./index.html';
import 'file?name=404.html!./404.html';
import 'file?name=robots.txt!./robots.txt';
import 'phovea_bootstrap_fontawesome/src/_font-awesome';
import 'phovea_bootstrap_fontawesome/src/_bootstrap';
import './style.scss';

import * as domino from './Domino';

var dominoApplication = domino.create();
dominoApplication.execute();

