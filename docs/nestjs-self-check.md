# NestJS — контрольні питання (self-check)

Відповідай письмово або усно ментору. Якщо не знаєш — зафіксуй тему для повторення.

## Dependency Injection

1. Чому `LobbyService` отримує `Repository<Lobby>` через `getRepositoryToken`, а не `new Repository()`?
2. Що станеться, якщо інжектити `Scope.REQUEST` сервіс у звичайний singleton `Service` без змін scope?
3. Де в проєкті використано `useFactory` і навіщо там `inject: [ConfigService]`?
4. Навіщо `SimulationService` інжектить `MULTIPLAYER_GRID_SIZE` замість захардкодженого `20`?

## Dynamic modules

1. У чому різниця між `imports: [XModule]` і `XModule.forRoot()` / `forRootAsync()`?
2. Чому `JwtModule.registerAsync` не можна замінити статичним `register({})` у production без втрат?
3. Коли має сенс робити `EngineConfigModule.forRoot()` окремо, а не читати `process.env` прямо в `SimulationService`?

## Modules

1. Навіщо `SimulationModule` експортує `SimulationService`, а `LobbyModule` його імпортує?
2. Що буде, якщо забути додати `TypeOrmModule.forFeature([Lobby])` у `LobbyModule`?
3. Де межа між `LobbyModule` і `SimulationModule` у твоєму домені?

## Architecture (лобі, симуляція, Elo)

1. Опиши потік від `POST /lobby/join` до зміни рейтингу після фінішу.
2. Навіщо `LobbyResponseMapper` винесено з `LobbyService`?
3. Яка роль `sharedRng` vs `carRng` у `SimulationEngine` для мультиплеєра?
4. Назви один ризик race condition у `join` / `submitConfig` і як би ти його зменшив.

## Короткі відповіді — додатково

- **Guards:** чим `JwtAuthGuard` відрізняється від middleware в Express?
- **Interceptors:** навіщо в success-відповіді поле `requestId`?
- **Pipes:** що робить `whitelist: true` у `ValidationPipe`?
- **WebSocket:** чому поточний `LobbyGateway` лише `ping/pong` і що треба для кімнат по `lobbyId`?
- **Testing:** чим unit-тест з моками репозиторію відрізняється від e2e з реальною БД?

---

Після проходження: познач пробіли й повтори відповідні дні плану.
