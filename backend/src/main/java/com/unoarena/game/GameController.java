package com.unoarena.game;

import com.unoarena.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api")
public class GameController {
 private final GameService games;private final UserRepository users;private final SimpMessagingTemplate socket;
 public GameController(GameService games,UserRepository users,SimpMessagingTemplate socket){this.games=games;this.users=users;this.socket=socket;}
 public record CreateRoom(@NotBlank @Size(max=48)String name,@Min(2) @Max(4)int maxPlayers,boolean isPrivate){}
 public record JoinRoom(@NotBlank String code){}
 public record Play(@NotBlank String cardId,UnoGame.Color color){}
 public record ComputerRequest(@Min(1) @Max(3) int botCount){}
 public record ComputerTurn(@NotBlank String botId){}
 @GetMapping("/rooms") public List<GameService.Room> rooms(){return games.list();}
 @PostMapping("/rooms/computer") public GameService.ComputerSession computer(@Valid @RequestBody ComputerRequest body,Authentication auth){return games.createComputerGame((String)auth.getPrincipal(),username((String)auth.getPrincipal()),body.botCount());}
 @GetMapping("/rooms/{code}") public GameService.Room room(@PathVariable String code,Authentication auth){return games.getRoom(code);}
 @PostMapping("/rooms") public GameService.Room create(@Valid @RequestBody CreateRoom body,Authentication auth){return games.create(body.name(),(String)auth.getPrincipal(),username((String)auth.getPrincipal()),body.maxPlayers(),body.isPrivate());}
 @PostMapping("/rooms/{code}/join") public GameService.Room join(@PathVariable String code,Authentication auth){return games.join(code,(String)auth.getPrincipal(),username((String)auth.getPrincipal()));}
 @PostMapping("/rooms/{code}/start") public UnoGame.View start(@PathVariable String code,Authentication auth){return publish(code,games.start(code,(String)auth.getPrincipal()));}
 @PostMapping("/rooms/{code}/end") public void end(@PathVariable String code,Authentication auth){games.end(code,(String)auth.getPrincipal());}
 @PostMapping("/rooms/{code}/return") public GameService.Room returnToRoom(@PathVariable String code,Authentication auth){return games.returnToRoom(code,(String)auth.getPrincipal());}
 @GetMapping("/games/{id}") public UnoGame.View state(@PathVariable String id,Authentication auth){return games.view(id,(String)auth.getPrincipal());}
 @PostMapping("/games/{id}/play") public UnoGame.View play(@PathVariable String id,@Valid @RequestBody Play body,Authentication auth){return publish(id,games.play(id,(String)auth.getPrincipal(),body.cardId(),body.color()));}
 @PostMapping("/games/{id}/draw") public UnoGame.View draw(@PathVariable String id,Authentication auth){return publish(id,games.draw(id,(String)auth.getPrincipal()));}
 @PostMapping("/games/{id}/uno") public UnoGame.View uno(@PathVariable String id,Authentication auth){return publish(id,games.uno(id,(String)auth.getPrincipal()));}
 @PostMapping("/games/{id}/computer-turn") public UnoGame.View computerTurn(@PathVariable String id,@Valid @RequestBody ComputerTurn body,Authentication auth){return publish(id,games.computerTurn(id,(String)auth.getPrincipal(),body.botId()));}
 private UnoGame.View publish(String id,UnoGame.View state){socket.convertAndSend("/topic/game/"+id,Map.of("type","STATE_CHANGED"));return state;}
 private String username(String id){return users.findById(id).orElseThrow().getUsername();}
}
