using AutoMapper;
using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Security;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.Reflection.Metadata;
using System.Xml.Linq;

namespace Dashboard.Application.BL
{
    public class UserBL : IUserBL
    {
        private readonly IMapper _mapper;
        private readonly IUserRepository _userRepository;
        private readonly IUserValidation _userValidation;
        private readonly IConfiguration _configuration;

        public UserBL(IMapper mapper, IUserRepository userRepository, IUserValidation userValidation, IConfiguration configuration)
        {
            _mapper = mapper;
            _userRepository = userRepository;
            _userValidation = userValidation;
            _configuration = configuration;
        }
        public async Task<UserDto?> GetByIdAsync(int id)
        {
            return _mapper.Map<UserDto>(await _userRepository.GetByIdAsync(id));
        }

        public async Task<List<UserDto>?> GetAllAsync()
        {
            return _mapper.Map<List<UserDto>>(await _userRepository.GetAllAsync());
        }

        public async Task<UserDto?> GetByDocumentAsync(string document)
        {
            var users = await _userRepository.GetAllAsync();
            if (users == null) throw new Exception("No se pudo obtener el usuario");
            User? user = users.FirstOrDefault(user => user.DOCUMENT == document);

            return _mapper.Map<UserDto>(user);
        }

        
        public async Task<UserDto?> GetByUserNameAsync(string userName)
        {
            var users = await _userRepository.GetAllAsync();
            if (users == null) throw new Exception("No se pudo obtener el usuario");
            User? user = users.FirstOrDefault(user => user.USERNAME == userName);

            return _mapper.Map<UserDto>(user);
        }

        public async Task<List<UserDto>?> GetByRoleAsync(int role)
        {
            var users = await _userRepository.GetAllAsync();
            return _mapper.Map<List<UserDto>>(users.Where(user => user.ID_ROLE == role));
        }

        public async Task<List<UserDto>?> GetByStatusAsync(int status)
        {
            var users = await _userRepository.GetAllAsync();
            return _mapper.Map<List<UserDto>>(users.Where(user => user.STATUS ==  Convert.ToInt32(Convert.ToBoolean(status))) );
        }

        public async Task<UserDto?> CreateAsync(UserDto newUser, int idUserCreator)
        {
            
            _userValidation.ValidateUserCreate(ref newUser);
            _userValidation.ValidateEmail(ref newUser);
            _userValidation.ValidateNewPassword(newUser.Pwd);
            if (newUser.ImgList != null || newUser.ImgList.Count != 0)
            {
                SaveUserImg(ref newUser);
            }else
            {
                newUser.Img = null;
            }
            var userToCreate = newUser;
            if (userToCreate.Document == null) throw new Exception("Datos para creacion incorrectos");
            if (await this.GetByDocumentAsync(userToCreate.Document) != null) throw new Exception("El usuario ya existe, no fué posible crearlo");
            userToCreate.Pwd = userToCreate.Pwd.GenerarHash(_configuration);
            if (userToCreate.IdClient <= 0) userToCreate.IdClient = null;
            userToCreate.IdUserCreated = idUserCreator;
            

            return _mapper.Map<UserDto>(await _userRepository.CreateAsync(userToCreate));
        }

        public async Task<UserDto?> UpdateAsync(UserDto user, bool changePwd)
        {
            
            _userValidation.ValidateUserUpdate(user);
            _userValidation.ValidateEmail(ref user);

            UserDto? userToUpdate = _mapper.Map<UserDto>(await _userRepository.GetByIdAsync(user.Id));
            if (userToUpdate == null) throw new Exception("El usuario no existe, no es posible modificarlo, debe crear el usuario");

            if (user.ImgList != null && user.ImgList.Count != 0)
            {
                SaveUserImg(ref user);
            }
            else
            {
                user.Img = userToUpdate.Img;
            }
            

            
            if ( changePwd == false ) { user.Pwd = null; }
            if (user.IdClient <= 0 ) user.IdClient = null;

            return _mapper.Map<UserDto>(await _userRepository.UpdateAsync(user));
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            if (id <= 0) throw new Exception("No se proporcionó identificador para eliminar el recurso");
            
            return await _userRepository.DeleteByIdAsync(id);
        }

        public async Task<string?> GetUserPasswordAsync(string document)
        {
            return await _userRepository.GetUserPassword(document);
        }
        

        public async Task<UserDto?> ChangePassword(UserDto? user, ChangePwdDto data, int idUserUpdater)
        {
            
            user.Pwd = await _userRepository.GetUserPassword(data.Document);
            user =  _userValidation.IsPasswordCorrect(user, data.OldPwd);
            if (user == null) throw new Exception("La contraseña actual no coincide");
            _userValidation.ValidateNewPassword(data.NewPwd);
            var updateUserObject = new UserDto()
            {
                Id = user.Id,
                Document = user.Document,
                IdTypeDocument = user.IdTypeDocument,
                Pwd = data.NewPwd.GenerarHash(_configuration),
                UserName = user.UserName,
                Name = user.Name,
                LastName = user.LastName,
                Phone = user.Phone,
                Email = user.Email,
                IdRole= user.IdRole,
                Status= user.Status,
                IdUserUpdated = idUserUpdater
            };

            return await this.UpdateAsync(updateUserObject, changePwd: true);

        }

        private void SaveUserImg(ref UserDto user)
        {
            string imgPath = @"images\users";

            imgPath = Path.Combine(imgPath, $"{user.UserName.Replace(" ", string.Empty)}.{user.ImgExt}");
            user.Img = "/" + imgPath.Replace('\\', '/');
            ImageAdmin.SaveStaticImage(imgPath, user.ImgList.ToArray());
        }
    }
}
