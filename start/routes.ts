/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
import AuthController from '#controllers/auth_controller'
import ExercisesController from '#controllers/exercises_controller'
import ApiEndpointsController from '#controllers/api_endpoints_controller'
import AccountsController from '#controllers/accounts_controller'
import FederationsController from '#controllers/federations_controller'
import ProjectsController from '#controllers/projects_controller'

/*
 *=================================================================
 *                          Main website
 *=================================================================
 */

router
  .group(() => {
    router.get('/', async ({ view }) => {
      return view.render('features/other/home')
    })

    router.get('/exercises', [ExercisesController, 'all'])
    router.on('/exercises/:repo_name').redirect('/exercises/:repo_name/details')
    router.get('/exercises/:repo_name/details', [ExercisesController, 'details'])
    router.get('/exercises/:repo_name/scoreboard', [ExercisesController, 'scoreboard'])
    router.get('/exercises/:repo_name/helper', [ExercisesController, 'helper'])
    router.get('/exercises/:repo_name/logs', [ExercisesController, 'logs'])

    router.get('/servers', async ({ view }) => {
      return view.render('features/servers/servers')
    })

    router.get('/account', async ({ view }) => {
      return view.render('features/account/account')
    })
  })
  .use([middleware.auth()])

/*
 *=================================================================
 *                          Admin website
 *=================================================================
 */

router
  .group(() => {
    router.get('/', async ({ view }) => {
      return view.render('features/admin/home')
    })

    router
      .get('/accounts/new', [AccountsController, 'newAccount'])
      .use(middleware.permissions(['create_users']))

    router
      .post('/accounts', [AccountsController, 'createAccount'])
      .use(middleware.permissions(['create_users']))

    router
      .get('/accounts', [AccountsController, 'listAccounts'])
      .use(middleware.permissions(['view_users']))

    router
      .group(() => {
        router
          .delete('/accounts/:id', [AccountsController, 'deleteAccount'])
          .where('id', {
            match: /^[0-9]+$/,
            cast: (value) => Number(value),
          })
          .use(middleware.permissions(['delete_users']))
        router.post('/createteams', [ProjectsController, 'createStudentsProject'])
        router.post('/createproject', [ProjectsController, 'createProject'])
      })
      .prefix('/api')
    router
      .get('/federations', [FederationsController, 'listFederations'])
      .use(middleware.permissions(['view_federations']))
  })
  .prefix('/admin')
  .use([middleware.auth()])

/*
 *=================================================================
 *                       Login website
 *=================================================================
 */

router.get('/login', async ({ view }) => {
  return view.render('features/account/login')
})
router.post('/login', [AuthController, 'login'])

router.get('/forgot-password', async ({ view }) => {
  return view.render('features/account/forgot-password')
})

/*
 *=================================================================
 *                          API Endpoint
 *=================================================================
 */

router
  .group(() => {
    router
      .group(() => {
        router.post('/git-event', [ApiEndpointsController, 'gitEvent'])
        router.post('/git-event-owner', [ApiEndpointsController, 'gitEventOwner'])
        router.post('/ci-result/', [ApiEndpointsController, 'ciResult'])
        router.post('/ci-result-owner/', [ApiEndpointsController, 'ciResultOwner'])
        router
          .group(() => {
            router.post('/', [ApiEndpointsController, 'createRepo'])
            router.put('/', [ApiEndpointsController, 'addMemberToRepo'])
            router.post('/fork', [ProjectsController, 'createStudentsProject'])
          })
          .prefix('/repos')
      })
      .prefix('/endpoint')
  })
  .prefix('/api/v1')
