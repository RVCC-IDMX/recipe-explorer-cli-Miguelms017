// src/app.js
/**
 * Main application file for the Recipe Explorer
 * Contains the command-line interface and application logic
 */

import readlineSync from 'readline-sync';
import * as api from './api.js';
import * as cache from './cache.js';
import * as favorites from './favorites.js';
import * as utils from './utils.js';

/**
 * Initialize the application
 *
 * @returns {Promise<boolean>} - True if initialization successful
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all | MDN: Promise.all}
 */
async function initialize() {
  // CHALLENGE 18: Implement initialize function
  // 1. Use Promise.all to initialize both the cache and favorites in parallel
  // 2. After initialization, clear expired cache entries
  // 3. Return true if successful
  // 4. Catch any errors, log them, and return false

  // YOUR CODE HERE
  try {
    await Promise.all([favorites.initializeFavorites(), cache.initializeCache()]);

    await cache.clearExpiredCache();

    return true;
  }
  catch (error) {
    console.error("initialization failed: ", error);
    return false
  }
}

/**
 * Search for recipes with caching
 * Demonstrates using cache before making API calls
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises | MDN: Using promises}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch | MDN: try...catch}
 */
async function searchRecipes() {
  const query = readlineSync.question('Enter search term: ');

  if (!query.trim()) {
    console.log('Search term cannot be empty');
    return;
  }

  console.log(`Searching for "${query}"...`);

  try {
    // CHALLENGE 19: Implement searchRecipes function
    // 1. Create a cache key for this search (e.g., `search_${query.toLowerCase()}`)
    // 2. Use cache.getCachedOrFetch to:
    //    - Try to get results from cache first
    //    - Fall back to api.searchMealsByName(query) if not in cache
    // 3. Display the results using utils.formatRecipeList
    // 4. If recipes were found, offer to view details for a specific recipe
    // 5. If the user wants to view details, call viewRecipeDetails with the chosen recipe ID

    // YOUR CODE HERE
    const key = `search_${query.toLowerCase()}`;

    const ans = await cache.getCachedOrFetch(key, async () => {
      const response = api.searchMealsByName(query);
      return response.json();
    })


    if (!ans || ans.length === 0) {
      console.log('No recipes found');
      return null;
    }

    console.log(utils.formatRecipeList(ans));

    const qna = readlineSync.question('Do you want to see details? Y/N').toLowerCase();

    if (qna == 'yes' || qna == 'y') {
      const indx = readlineSync.question('What recipe do you want to see?') - 1;

      if (indx >= 0 && indx < ans.length) {
        viewRecipeDetails(ans[indx].id);
      } else {
        console.log("Sorry, you must select one valid option");
      }

    }

  } catch (error) {
    console.error('Error searching recipes:', error.message);
  }
}

/**
 * View recipe details with related recipes
 * Demonstrates Promise chaining
 *
 * @param {string} recipeId - ID of recipe to view
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises | MDN: Using promises}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then | MDN: Promise.then}
 */
async function viewRecipeDetails(recipeId) {
  if (!recipeId) {
    recipeId = readlineSync.question('Enter recipe ID: ');
  }

  if (!recipeId.trim()) {
    console.log('Recipe ID cannot be empty');
    return;
  }

  console.log(`Fetching details for recipe ${recipeId}...`);

  try {
    // CHALLENGE 20: Implement viewRecipeDetails function
    // 1. Create a cache key for this recipe (e.g., `recipe_${recipeId}`)
    // 2. Use cache.getCachedOrFetch to get recipe details
    // 3. If no recipe is found, display a message and return
    // 4. Display the recipe using utils.formatRecipe
    // 5. Check if the recipe is in favorites and offer to add/remove
    // 6. Use Promise chaining (.then, .catch) to:
    //    - Fetch related recipes based on this recipe's category
    //    - Display them when the promise resolves
    //    - Handle any errors in the chain

    // YOUR CODE HERE

    const key = `recipe_${recipeId}`;

    const ans = await cache.getCachedOrFetch(key, async () => {
      const response = await api.getMealById(recipeId);
      const data = await response.json();
      console.log("response: ", data);
      return data;
    });

    if (!ans || ans.meals.length === 0) {
      console.log("The recipe was not found");
      return null;
    }

    const recipe = ans.meals[0];

    console.log(utils.formatRecipe(ans));

    const isFavorite = await favorites.isInFavorites();

    if (isFavorite) {
      const qna1 = readlineSync.question("This recipe is on favorites. Do you want to remove it? Y/N").toLowerCase();
      if (qna1 == 'y' || qna1 == 'yes') {
        favorites.removeFavorite(recipeId);
      }
    } else {
      const qna2 = readlineSync.question("This recipe is not on favorites. Do you want to add it? Y/N").toLowerCase();
      if (qna2 == 'y' || qna2 == 'yes') {
        favorites.addFavorite(recipeId);
      }
    }

    fetch(api.getRelatedRecipes(recipe.strCategory))
      .then(response => response.json())
      .then(RelatedRecipes => {
        if (RelatedRecipes.length > 0) {
          console.log("Related recipes");
          console.log(utils.formatRecipeList(RelatedRecipes));
        }
      })
      .catch(error => console.error("Error detching related recipes:", error.message));

    //______________________________________________________________________
  } catch (error) {
    console.error('Error viewing recipe details:', error.message);
  }
}

/**
 * Explore recipes by first letter
 * Demonstrates using Promise.all
 */
async function exploreByFirstLetter() {
  const letters = readlineSync.question('Enter up to 3 letters to search (e.g. abc): ');

  if (!letters.trim()) {
    console.log('Please enter at least one letter');
    return;
  }

  // Get unique letters (limit to 3 to avoid API abuse)
  const uniqueLetters = Array.from(new Set(letters.toLowerCase())).slice(0, 3);

  console.log(`Searching for recipes starting with: ${uniqueLetters.join(', ')}...`);

  try {
    // CHALLENGE 21: Implement exploreByFirstLetter function
    // 1. Create a cache key for these letters (e.g., `letters_${uniqueLetters.sort().join('')}`)
    // 2. Use cache.getCachedOrFetch to get recipes, falling back to api.searchMealsByFirstLetter
    // 3. Display the results using utils.formatRecipeList
    // 4. If recipes were found, offer to view details for a specific recipe
    // 5. If the user wants to view details, call viewRecipeDetails with the chosen recipe ID

    // YOUR CODE HERE
    const key = `letters_${uniqueLetters.sort().join('')}`;

    const ans = await cache.getCachedOrFetch(key, async () => {
      const response = api.searchMealsByFirstLetter(key);
      return response
    })

    utils.formatRecipeList(ans);

    const qna = readlineSync.question('What recipe do you want to see? ') - 1;

    if (qna >= 0 && qna < ans.length) {
      viewRecipeDetails(ans[qna].id);
    } else {
      console.log("Sorry, you must select one valid option");
    }
    //____________________________________________________________________________________________
  } catch (error) {
    console.error('Error exploring recipes by first letter:', error.message);
  }
}

/**
 * Search recipes by ingredient with timeout
 * Demonstrates using Promise.race for timeout
 */
async function searchByIngredient() {
  const ingredient = readlineSync.question('Enter an ingredient: ');

  if (!ingredient.trim()) {
    console.log('Ingredient cannot be empty');
    return;
  }

  console.log(`Searching for recipes with ${ingredient}...`);

  try {
    // CHALLENGE 22: Implement searchByIngredient function
    // 1. Create a cache key for this ingredient (e.g., `ingredient_${ingredient.toLowerCase()}`)
    // 2. Use cache.getCachedOrFetch to get results, falling back to api.getMealsByIngredient
    // 3. Check if the result is a string (error message) or an array
    // 4. If it's a string, display the message and return
    // 5. Display the results using utils.formatRecipeList
    // 6. If recipes were found, offer to view details for a specific recipe
    // 7. If the user wants to view details, call viewRecipeDetails with the chosen recipe ID

    // YOUR CODE HERE
    const key = `ingredient_${ingredient.toLowerCase()}`

    const ans = await cache.getCachedOrFetch(key, async () => {
      return await api.getMealsByIngredient(ingredient)
    });

    if (!Array.isArray(ans) || ans.length === 0) {
      console.log("no recipes found");
      return null;
    }


    console.log(utils.formatRecipeList(ans));

    const qna = readlineSync.question('What recipe do you want to see? ') - 1;

    if (qna >= 0 && qna < ans.length) {
      viewRecipeDetails(ans[qna].idMeal);
    } else {
      console.error("Sorry, you must select one valid option");
      return;
    }

    //_____________________________________________________________________________________________
  } catch (error) {
    console.error('Error searching by ingredient:', error.message);
  }
}

/**
 * View favorite recipes
 */
async function viewFavorites() {
  try {
    // Get favorites
    const favoriteRecipes = await favorites.getFavorites();

    if (favoriteRecipes.length === 0) {
      console.log('You have no favorite recipes');
      return;
    }

    console.log(utils.formatRecipeList(favoriteRecipes));

    // Allow viewing details
    const viewDetails = readlineSync.keyInYN('Would you like to view details for a recipe?');

    if (viewDetails) {
      const index = readlineSync.questionInt(`Enter recipe number (1-${favoriteRecipes.length}): `, {
        limit: input => {
          const num = parseInt(input);
          return num >= 1 && num <= favoriteRecipes.length;
        },
        limitMessage: `Please enter a number between 1 and ${favoriteRecipes.length}`
      });

      // View the selected recipe
      await viewRecipeDetails(favoriteRecipes[index - 1].idMeal);
    }
  } catch (error) {
    console.error('Error viewing favorites:', error.message);
  }
}

/**
 * Discover random recipes
 * Demonstrates Promise.race to get the first of several random recipes
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race | MDN: Promise.race}
 */
async function discoverRandom() {
  console.log('Fetching random recipes...');

  try {
    // CHALLENGE 23: Implement discoverRandom function
    // 1. Create three promises for random recipes using api.getRandomMeal()
    // 2. Use Promise.race to get the first one that resolves
    // 3. Handle the case where no recipe is found
    // 4. Display the recipe using utils.formatRecipe
    // 5. Check if the recipe is in favorites and offer to add/remove
    // 6. Handle any errors appropriately

    // YOUR CODE HERE
    const prom1 = api.getRandomMeal();
    const prom2 = api.getRandomMeal();
    const prom3 = api.getRandomMeal();

    const win = await Promise.race([prom1, prom2, prom3]);

    if (win === null) {
      console.error("recipe not found");
      return;
    }

    console.log(utils.formatRecipe(win))

    const isFavorite = await favorites.isInFavorites(win.idMeal)

    if (isFavorite) {
      const qna1 = readlineSync.question("This recipe is on favorites. Do you want to remove it? Y/N").toLowerCase();
      if (qna1 == 'y' || qna1 == 'yes') {
        await favorites.removeFavorite(win.idMeal);
      }
    } else {
      const qna2 = readlineSync.question("This recipe is not on favorites. Do you want to add it? Y/N").toLowerCase();
      if (qna2 == 'y' || qna2 == 'yes') {
        await favorites.addFavorite(win);
      }
    }

    //________________________________________________________________________
  } catch (error) {
    console.error('Error discovering random recipes:', error.message);
  }
}

/**
 * Display the main menu and handle user input
 */
async function showMainMenu() {
  console.log('\n===== RECIPE EXPLORER =====');
  console.log('1. Search recipes');
  console.log('2. View recipe details by ID');
  console.log('3. Explore recipes by first letter');
  console.log('4. Search by ingredient');
  console.log('5. View favorites');
  console.log('6. Discover random recipe');
  console.log('7. Exit');

  const choice = readlineSync.questionInt('Enter your choice (1-7): ', {
    limit: [1, 2, 3, 4, 5, 6, 7],
    limitMessage: 'Please enter a number between 1 and 7'
  });

  switch (choice) {
    case 1:
      await searchRecipes();
      break;
    case 2:
      await viewRecipeDetails();
      break;
    case 3:
      await exploreByFirstLetter();
      break;
    case 4:
      await searchByIngredient();
      break;
    case 5:
      await viewFavorites();
      break;
    case 6:
      await discoverRandom();
      break;
    case 7:
      console.log('Thank you for using Recipe Explorer!');
      process.exit(0);
  }

  // Return to main menu after function completes
  return showMainMenu();
}

/**
 * Main application entry point
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function | MDN: async function}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch | MDN: Promise.catch}
 */
async function main() {
  // CHALLENGE 24: Implement main function
  // 1. Display an initialization message
  // 2. Call initialize() to set up the application
  // 3. Handle initialization failure (exit with error code 1)
  // 4. Display a welcome message on success
  // 5. Start the main menu loop by calling showMainMenu()
  // 6. Add error handling for any uncaught exceptions

  // YOUR CODE HERE


  try {

    const init = await initialize();

    if (!init) {
      console.log("The initialiation failed. Leaving...")
      process.exit(1);
    }

    console.log("Running...");

    await showMainMenu();

  } catch (error) {
    console.error("Uncaught Error: ", error);
    process.exit(1);
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

console.log(`Welcome To The Recipe Explorer\n Powered by TheMealDB`);

main();

export default {
  main,
  searchRecipes,
  viewRecipeDetails,
  exploreByFirstLetter,
  searchByIngredient,
  viewFavorites,
  discoverRandom
};
