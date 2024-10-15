import { CanActivate, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtRsaVerifier } from 'aws-jwt-verify';
import { WsException } from '@nestjs/websockets';
import { JwtRsaVerifierSingleIssuer } from 'aws-jwt-verify/jwt-rsa';

@Injectable()
export class ChatAuthGuard implements CanActivate {
  verifier: JwtRsaVerifierSingleIssuer<{
    issuer: string;
    audience: string;
    jwksUri: string;
  }>;

  private logger: Logger = new Logger(ChatAuthGuard.name);

  constructor(private readonly configService: ConfigService) {
    this.verifier = JwtRsaVerifier.create({
      issuer: this.configService.get('AWS_COGNITO_AUTHORITY'),
      audience: this.configService.get('AWS_COGNITO_CLIENT_ID'),
      jwksUri: `${this.configService.get('AWS_COGNITO_AUTHORITY')}/.well-known/jwks.json`,
    });
  }

  // Extract the token verification logic into a separate method
  async verifyToken(client: any): Promise<any> {
    const headers = client.handshake?.headers;
    const authorization = headers['authorization'];

    if (!authorization) {
      throw new WsException('Unauthorized: Missing JWT token');
    }

    try {
      const payload = await this.verifier.verify(authorization);
      return { ...payload, username: payload['cognito:username'] };
    } catch (error) {
      this.logger.error(`Unauthorized connection attempt: Invalid JWT token for client ${client.id}`);
      client.emit('ERROR', `Unauthorized: ${error.message}`);
      throw new WsException('Unauthorized: Invalid JWT token');
    }
  }

  // Guard canActivate method
  async canActivate(context: any): Promise<any> {
    const client: any = context.switchToWs().getClient();

    try {
      const user = await this.verifyToken(client);
      client['user'] = user;
      return true;
    } catch (error) {
      throw new WsException('Unauthorized: Invalid JWT token');
    }
  }
}
