// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
import * as fs from 'fs';
import { NodeInventoryProvider } from './InventoryView';
import { NodePokedexProvider } from './PokedexView';

import * as savefile from './data/savefile.json';
import * as pokedex from './data/pokedex.json';

var extensionPath = vscode.extensions.getExtension('chungmancheng.pokemon-code-2')?.extensionPath;
var items = savefile.items;
var pokemon_boxes: typeof pokedex = savefile.pokemon_boxes;
var shown_pokemon = 0;
var current_razzberry = false;
var spawn_rarity = 300 // 1 chance out of spawn_rarity to spawn a Pokemon, 2 chances to spawn items. Each 1/spawn_rarity is a change in text-selection position.
var inventoryProvider: NodeInventoryProvider;
var pokedexProvider : NodePokedexProvider;


function save(){
    
    fs.writeFile(`${extensionPath}/src/data/savefile.json`, JSON.stringify({'items': items, 'pokemon_boxes': pokemon_boxes}), (err) => {
        if (err)
            throw err;

    });

    //Update UI 
    pokedexProvider.refresh();
    inventoryProvider.refresh();

}

function show_pokemon(){
    
    var pokemon_list: Array<string> = new Array<string>();
    
    for (var i = 0; i < pokemon_boxes.length; i++){
        pokemon_list.push(pokedex[i].name);
    }
    vscode.window.showQuickPick(pokemon_list).then(function(){

    });

}

function show_inventory(){

    var catch_options: Array<string> = new Array<string>();
    
    for (var i = 0; i < items.length; i++){
        if ( items[i].amount > 0 ){
            catch_options.push( items[i].name );
        }
    }

    vscode.window.showQuickPick(catch_options).then(function(choice){

    });

}

// Let's set everything up to start hunting for Pokemon!
function init_tallgrass(){
    
    var newDecoration: vscode.TextEditorDecorationType;

    function _catchAttempt(pokeball:string){
        var rate: number = 999;
        var rates = [
            {
                "name": "Pokeball",
                "rate": 255
            },{
                "name": "Greatball",
                "rate": 200
            },{
                "name": "Ultraball",
                "rate": 150
            }
        ];
        for (var i = 0; i < rates.length; i++ ){
            if (rates[i].name == pokeball)
                rate = rates[i].rate;
        }

        if (current_razzberry){
            rate = rate * .8;
            current_razzberry = false;
        }
        var catch_num = Math.floor(Math.random()*rate);
        var pokemon_num = 255 - pokedex[shown_pokemon].exp;
        if (pokemon_num < 1){
            pokemon_num = 1;
        }
        if (catch_num <= pokemon_num){
            vscode.window.showInformationMessage('You caught the '+pokedex[shown_pokemon].name+'! Mom would be proud.');

            pokemon_boxes.push( pokedex[shown_pokemon] );
            save();
            vscode.window.activeTextEditor?.setDecorations(newDecoration, []);
            shown_pokemon = -1;
        }else{
            var fleeCheck = Math.floor(Math.random()*1000);
            if (fleeCheck < pokedex[shown_pokemon].exp){
                vscode.window.showErrorMessage('Sad day, '+pokedex[shown_pokemon].name+' ran away...');
                vscode.window.activeTextEditor?.setDecorations(newDecoration, []);
                shown_pokemon = -1;
            }else{
                vscode.window.showWarningMessage('Oh no, the '+pokedex[shown_pokemon].name+' broke free!', {}, ...['Try Again']).then(function(chosen){
                    if (chosen == 'Try Again'){
                        _catch();
                    }else{
                        vscode.window.activeTextEditor?.setDecorations(newDecoration, []);
                        shown_pokemon = -1;
                    }
                });
            }
        }
    }

    function _catch(){
        var catch_options: Array<string> = new Array<string>();
        
        for (var i = 0; i < items.length; i++){
            if ( items[i].amount > 0 ){
                if (items[i].name != "Razzberry" || !current_razzberry)
                    catch_options.push( items[i].name );
            }
        }

        vscode.window.showQuickPick(catch_options).then(function(choice){
            if (choice){
                for (var i = 0; i < items.length; i++){
                    if (items[i].name == choice)
                        items[i].amount--;
                }
                save();
                switch(choice){
                    case 'Pokeball':
                    case 'Greatball':
                    case 'Ultraball':
                        _catchAttempt(choice)
                        break;
                    case 'Razzberry':
                        current_razzberry = true;
                        vscode.window.showInformationMessage('You fed the Razzberry to '+pokedex[shown_pokemon].name+'!', {}, ...['Next']).then(function(chosen){
                            _catch();
                        });
                        break;
                }
            }else{
                vscode.window.activeTextEditor?.setDecorations(newDecoration, []);
                shown_pokemon = -1;
            }
        });
    }

    function _walk(){

        if (shown_pokemon > 0){
            return;
        }

        var n = Math.floor(Math.random()*spawn_rarity);
        if (n==1 || n==2){
            shown_pokemon = Math.floor(Math.random()*150);
            if (vscode.window.activeTextEditor){
                vscode.window.showInformationMessage('A wild '+pokedex[shown_pokemon].name+' appeared on line ' + (vscode.window.activeTextEditor.selection.active.line+1) + '!', {},...['Catch']).then(function(chosen){
                    if (chosen=="Catch"){
                        _catch();
                    }else{
                        vscode.window.activeTextEditor?.setDecorations(newDecoration, []);
                        shown_pokemon = -1;
                    }
                });
            }
            
            newDecoration = vscode.window.createTextEditorDecorationType({
                gutterIconSize: 'contain',
                gutterIconPath: vscode.Uri.parse(extensionPath + '/imgs/sprites/'+(shown_pokemon+1)+'.png')
            });
            if ( vscode.window.activeTextEditor?.selection.active.line ){
                var opts = {
                    range: new vscode.Range(vscode.window.activeTextEditor.selection.active.line +1-1, 0, vscode.window.activeTextEditor.selection.active.line+1-1, 0),
                    hoverMessage: ""
                }
                vscode.window.activeTextEditor?.setDecorations(newDecoration, [opts]);
            }            
        }else if (n==3){
            var item_drop_possibilities = ['Pokeball', 'Pokeball', 'Pokeball', 'Pokeball', 'Pokeball', 'Greatball', 'Greatball', 'Ultraball', 'Razzberry'];
            var item_drops = [];
            item_drops.push(item_drop_possibilities[Math.floor(Math.random()*item_drop_possibilities.length)]);
            item_drops.push(item_drop_possibilities[Math.floor(Math.random()*item_drop_possibilities.length)]);
            item_drops.push(item_drop_possibilities[Math.floor(Math.random()*item_drop_possibilities.length)]);
            vscode.window.showInformationMessage('You picked up: '+item_drops[0]+', '+item_drops[1]+', and '+item_drops[2]+'!').then(function(){});
            
            for ( var i = 0; i < 3; i++ ){
                for ( var j = 0; j < items.length; j++ ){
                    if ( item_drops[i] == items[j].name ){
                        items[j].amount++;
                    }
                }
            }
            save();
        }
    }
    
    vscode.window.onDidChangeTextEditorSelection(_walk);

}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context: vscode.ExtensionContext) {

    // load model
    pokedexProvider.refresh();
    inventoryProvider.refresh();

    // extension activates
    init_tallgrass();
    vscode.window.showInformationMessage('Your Pokemon journey has begun!', {});

    inventoryProvider = new NodeInventoryProvider();
    context.subscriptions.push(
		vscode.window.registerTreeDataProvider("package-inventory", inventoryProvider )
    );

    pokedexProvider = new NodePokedexProvider();
    context.subscriptions.push(
		vscode.window.registerTreeDataProvider("package-pokedex", pokedexProvider )
    );

    // listen to "Pokemon Code - Pokedex" command
    var disposable2 = vscode.commands.registerCommand('extension.showPokemon', function () {

        show_pokemon();

    });

    // listen to "Pokemon Code - Inventory" command
    var disposable3 = vscode.commands.registerCommand('extension.showInventory', function () {

        show_inventory();

    });

    context.subscriptions.push(disposable2);
    context.subscriptions.push(disposable3);
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {

}

exports.deactivate = deactivate;