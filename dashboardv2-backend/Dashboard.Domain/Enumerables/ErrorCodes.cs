namespace Dashboard.Domain.Enumerables
{
    public enum ErrorCodes
    {
        NotAllowed,
        NotFound,
        RoleNotFound,
        UserLoggedNotExists,
        TokenExpired,
        PaypadLoggedNotExists,
        OnlyUsersAllowed,
        OnlyPaypadsAllowed,
        DbError
    }
}
