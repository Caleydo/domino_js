/**
 * Created by Tobias Appl on 8/4/2016.
 */

// Determine the order of css files manually
import 'file-loader?name=index.html!extract-loader!html-loader!./index.html';
import 'file-loader?name=404.html!./404.html';
import 'file-loader?name=robots.txt!./robots.txt';
import 'phovea_ui/src/_font-awesome';
import 'phovea_ui/src/_bootstrap';
import './style.scss';

import * as domino from './Domino';

var dominoApplication = domino.create();
dominoApplication.execute();

