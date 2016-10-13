/*
* @Author: Manraj Singh
* @Date:   2016-08-27 20:49:04
* @Last Modified by:   Manraj Singh
* @Last Modified time: 2016-09-19 10:57:02
*/

"use strict";

const league_ids = require('./league_ids');
const Table = require('cli-table');
const chalk = require('chalk');
const moment = require('moment');


/**
 * [API URL for all requests]
 * @type {String}
 */
const API_URL = 'https://api.football-data.org/v1/';
/**
 * [URL to report to for any issue related to project]
 * @type {String}
 */
const BUGS_URL = "https://github.com/ManrajGrover/football-cli/issues";

const buildScore = (name, homeTeam, goalsHomeTeam, goalsAwayTeam, awayTeam, time) => {
  return (
    `${chalk.green.bold(name)}  ${chalk.cyan.bold(homeTeam)} ${chalk.cyan.bold(goalsHomeTeam)} vs. ` +
    `${chalk.red.bold(goalsAwayTeam)} ${chalk.red.bold(awayTeam)} ${chalk.yellow.bold(time)}`
  );
};

const fixturesHelper = (league, name, team, body) => {
  let data = JSON.parse(body);
  let fixtures = data.fixtures;

  if(fixtures.length === 0) {
    updateMessage("UPDATE", "Sorry, no fixtures to show right now");
    return;
  }

  for(let i = 0; i < fixtures.length; i++) {
    let fixture = fixtures[i];

    let homeTeam = fixture.homeTeamName;
    let awayTeam = fixture.awayTeamName;
    let goalsHomeTeam = (fixture.result.goalsHomeTeam === null) ? "-1" : fixture.result.goalsHomeTeam;
    let goalsAwayTeam = (fixture.result.goalsAwayTeam === null) ? "-1" : fixture.result.goalsAwayTeam;

    name = (league === undefined) ? getLeagueName(fixture) : name;

    let time = (fixture.status === "IN_PLAY") ? "LIVE" : moment(fixture.date).calendar();

    if(team !== undefined ) {
      if ( (homeTeam.toLowerCase()).indexOf((team).toLowerCase()) !== -1 ||
          (awayTeam.toLowerCase()).indexOf((team).toLowerCase()) !== -1 ) {
        console.log( buildScore(name, homeTeam, goalsHomeTeam, goalsAwayTeam, awayTeam, time) );
      }
    }
    else {
      console.log( buildScore(name, homeTeam, goalsHomeTeam, goalsAwayTeam, awayTeam, time) );
    }
  }

};

const getLeagueName = (fixture) => {
  let compUrl = fixture._links.competition.href;
  let parts = compUrl.split('/');
  let id = parts[parts.length-1];

  for(let league in league_ids) {
    if(league_ids[league].id == id) {
      return league_ids[league].caption;
    }
  }

  return "";
};

const getStandingsTableInstance = () => {
  return new Table({
    head: [
      chalk.bold.white.bgCyan('Rank'),
      chalk.bold.white.bgCyan('Team'),
      chalk.bold.white.bgCyan('Played'),
      chalk.bold.white.bgCyan('Goal Diff'),
      chalk.bold.white.bgCyan('Points')
    ],
    colWidths: [ 7, 25, 10, 15, 10]
  });
};

const getURL = (endPoint) => {
  return API_URL + endPoint;
};

const printScores = (arr, live) => {

  for(let i = 0; i < arr.length; i++){
    let fixture = arr[i];

    let name = getLeagueName(fixture);
    let homeTeam = fixture.homeTeamName;
    let awayTeam = fixture.awayTeamName;
    let goalsHomeTeam = (fixture.result.goalsHomeTeam === null) ? "-1" : fixture.result.goalsHomeTeam;
    let goalsAwayTeam = (fixture.result.goalsAwayTeam === null) ? "-1" : fixture.result.goalsAwayTeam;
    let time = (live === true) ? "LIVE": moment(fixture.date).calendar();

    console.log( buildScore(name, homeTeam, goalsHomeTeam, goalsAwayTeam, awayTeam, time) );
  }

};

const refresh = (body) => {
  let data = JSON.parse(body),
      newLeagueIDs = {};

  for(let i = 0; i < data.length; i++) {
    let comp = data[i];

    newLeagueIDs[comp.league] = {
      "id": comp.id,
      "caption": comp.caption
    };
  }

  return newLeagueIDs;
};

const scoresHelper = (l, team, body) => {
  let data = JSON.parse(body);
  let fixtures = data.fixtures;
  let live = [];
  let scores = [];

  for(let i = 0; i < fixtures.length; i++) {

    let fixture = fixtures[i],
        homeTeam = (fixture.homeTeamName).toLowerCase(),
        awayTeam = (fixture.awayTeamName).toLowerCase();

    team = team.toLowerCase();

    if(fixture.status === "IN_PLAY" && (homeTeam.indexOf(team) !== -1 ||
                                        awayTeam.indexOf(team) !== -1) ) {
      live.push(fixture);
      scores.push(fixture);
    }
    else if(fixture.status === "FINISHED" && (homeTeam.indexOf(team) !== -1 ||
                                              awayTeam.indexOf(team) !== -1) ) {
      scores.push(fixture);
    }
  }

  if(l){

    if(live.length !== 0) {
      printScores(live, true);
    }
    else {
      updateMessage("UPDATE", "Sorry, no live match right now");
    }

  }
  else{

    if(scores.length !== 0){
      printScores(scores, false);
    }
    else{
      updateMessage("UPDATE", "Sorry, no scores to show right now");
    }

  }
};

const standings = (body) => {
  let data = JSON.parse(body);
  let table;

  if(data.standing !== undefined) {
    let standing = data.standing;

    table = getStandingsTableInstance();

    for(let i = 0; i < standing.length; i++) {
      let team = standing[i];
      table.push([
        chalk.bold.magenta(team.position),
        chalk.bold.cyan(team.teamName),
        chalk.bold.yellow(team.playedGames),
        chalk.bold.blue(team.goalDifference),
        chalk.bold.green(team.points)
      ]);
    }

    console.log( table.toString() );
  }
  else {
    let standings = data.standings;

    for(let groupCode in standings) {
      console.log( chalk.bgCyan.bold.white(groupCode) );

      let group = standings[groupCode];

      table = getStandingsTableInstance();

      for(let i = 0; i < group.length; i++) {
        let team = group[i];

        table.push([
          chalk.bold.magenta(team.rank),
          chalk.bold.cyan(team.team),
          chalk.bold.yellow(team.playedGames),
          chalk.bold.blue(team.goalDifference),
          chalk.bold.green(team.points)
        ]);

      }

      console.log( table.toString() );
    }
  }
};

const updateMessage = (TYPE, message) => {
  message = (typeof message !== 'undefined') ?  message : "";

  switch(TYPE) {

    case "REQ_ERROR":
      console.log(
        chalk.red.bold(`Sorry, an error occured. Please report issues to ${BUGS_URL} if problem persists.`)
      );
      break;

    case "UPDATE":
      console.log(chalk.bold.cyan(message));
      break;

    case "LEAGUE_ERR":
      throw new Error(chalk.red.bold("No league found. " +
                                     "Please check the League Code entered with the list `football lists`."));

    case "FIX_INPUT_ERR":
      throw new Error(chalk.red.bold("Days cannot be a negative value."));

    default:
      console.log("ERROR OCCURED.");
  }
};

module.exports = {
  "fixturesHelper": fixturesHelper,
  "getURL": getURL,
  "refresh": refresh,
  "scoresHelper": scoresHelper,
  "standings": standings,
  "updateMessage": updateMessage
};
